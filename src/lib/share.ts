import type { UnbullshitResult } from "./pipeline";

// ---------------------------------------------------------------------------
// Share links — the whole run (input + result) is base64url-encoded into the
// URL hash. Nothing ever touches a server: the hash is never sent anywhere.
// ---------------------------------------------------------------------------

export interface SharedRun {
  input: string;
  result: UnbullshitResult;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64: string): Uint8Array {
  const pad = b64.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeShare(run: SharedRun): string {
  const json = JSON.stringify({ v: 1, i: run.input, r: run.result });
  return toBase64Url(new TextEncoder().encode(json));
}

export function decodeShare(hash: string): SharedRun | null {
  try {
    const m = hash.match(/^#s=(.+)$/);
    if (!m) return null;
    const json = new TextDecoder().decode(fromBase64Url(m[1]));
    const parsed = JSON.parse(json) as { v?: number; i?: string; r?: UnbullshitResult };
    if (!parsed.i || !parsed.r?.finalPrompt) return null;
    return { input: parsed.i, result: parsed.r };
  } catch {
    return null;
  }
}

export function shareUrl(run: SharedRun): string {
  return `${location.origin}${location.pathname}#s=${encodeShare(run)}`;
}

/** ~64kB is where browsers start complaining; past that, skip sharing. */
export function shareIsTooLarge(run: SharedRun): boolean {
  return encodeShare(run).length > 60_000;
}

// ---------------------------------------------------------------------------
// Run history — localStorage only, capped.
// ---------------------------------------------------------------------------

export interface HistoryEntry extends SharedRun {
  id: string;
  ts: number;
  model: string;
}

const HISTORY_KEY = "unbullshitify.history.v1";
const HISTORY_MAX = 12;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

export function pushHistory(entry: Omit<HistoryEntry, "id" | "ts">): HistoryEntry[] {
  const full: HistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ts: Date.now(),
  };
  const next = [full, ...loadHistory()].slice(0, HISTORY_MAX);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
