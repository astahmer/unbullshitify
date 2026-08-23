import { chat } from "@tanstack/ai";
import { openaiCompatibleText } from "@tanstack/ai-openai/compatible";
import type { ModelMessage } from "@tanstack/ai";
import { Data, Effect, Exit, Schedule } from "effect";
import type { Settings } from "./settings";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class ProviderError extends Data.TaggedError("ProviderError")<{
  readonly message: string;
  readonly retryable: boolean;
}> {}

export class PipelineError extends Data.TaggedError("PipelineError")<{
  readonly message: string;
}> {}

const RETRYABLE_RE =
  /(rate.?limit|\b429\b|timeout|timed out|network|socket|ECONN|\b5\d\d\b|temporarily)/i;

function toProviderError(cause: unknown): ProviderError {
  const message =
    cause instanceof Error
      ? cause.message
      : typeof cause === "string"
        ? cause
        : JSON.stringify(cause);
  return new ProviderError({
    message: message.slice(0, 500),
    retryable: RETRYABLE_RE.test(message) || isStatus(cause, [408, 429, 500, 502, 503, 504, 529]),
  });
}

function isStatus(cause: unknown, statuses: number[]): boolean {
  const status = (cause as { status?: number } | null)?.status;
  return typeof status === "number" && statuses.includes(status);
}

// ---------------------------------------------------------------------------
// LLM call — TanStack AI chat(), streamed, wrapped in an Effect.
// Interruption of the fiber aborts the underlying HTTP request.
// ---------------------------------------------------------------------------

interface CallArgs {
  readonly settings: Settings;
  readonly system: string;
  readonly messages: ModelMessage[];
  readonly onDelta: (delta: string) => void;
}

const streamChat = ({
  settings,
  system,
  messages,
  onDelta,
}: CallArgs): Effect.Effect<string, ProviderError> =>
  Effect.async<string, ProviderError>((resume) => {
    const abortController = new AbortController();
    let text = "";
    void (async () => {
      try {
        const adapter = openaiCompatibleText(settings.model, {
          baseURL: settings.baseURL,
          apiKey: settings.apiKey,
          dangerouslyAllowBrowser: true,
        });
        const stream = chat({
          adapter,
          messages,
          systemPrompts: [system],
          abortController,
        });
        for await (const chunk of stream) {
          if (chunk.type === "TEXT_MESSAGE_CONTENT") {
            text += chunk.delta;
            onDelta(chunk.delta);
          }
        }
        if (!text.trim()) {
          resume(
            Exit.fail(
              new ProviderError({
                message: "Model returned an empty response",
                retryable: true,
              }),
            ),
          );
          return;
        }
        resume(Exit.succeed(text));
      } catch (cause) {
        // Swallow errors caused by our own abort — the fiber is being
        // interrupted anyway; resuming would be a no-op but keeps logs clean.
        if (abortController.signal.aborted) {
          resume(Exit.succeed(text));
          return;
        }
        resume(Exit.fail(toProviderError(cause)));
      }
    })();
    return Effect.sync(() => abortController.abort());
  });

const retryPolicy = Schedule.exponential("600 millis", 2).pipe(
  Schedule.compose(Schedule.recurs(2)),
);

const callLLM = (args: CallArgs): Effect.Effect<string, ProviderError> =>
  streamChat(args).pipe(
    Effect.retry({
      schedule: retryPolicy,
      until: (error) => !error.retryable,
    }),
  );

// ---------------------------------------------------------------------------
// The technique: round-trip prompt inversion ("prompt reflection")
//
// 1. INVERT   — forensic analysis of the message's tells → candidate prompt
// 2. VERIFY   — regenerate from the candidate alone (fresh assistant turn)
// 3. REFINE   — diff original vs regeneration → sharpened candidate
//    (2 & 3 repeat N rounds; local trigram fidelity tracks convergence)
// ---------------------------------------------------------------------------

export interface Tell {
  signal: string;
  evidence: string;
}

export interface RoundResult {
  round: number;
  regenerated: string;
  critique: string[];
  fidelity: number;
}

export interface UnbullshitResult {
  finalPrompt: string;
  confidence: number;
  messageType: string;
  tells: Tell[];
  rounds: RoundResult[];
}

export type StepKind = "invert" | `verify-${number}` | `refine-${number}`;

export type PipelineEvent =
  | { type: "step-start"; stepId: StepKind; label: string }
  | { type: "step-delta"; stepId: StepKind; delta: string }
  | { type: "step-done"; stepId: StepKind }
  | { type: "result"; result: UnbullshitResult };

export interface RunOptions {
  readonly input: string;
  readonly settings: Settings;
  /** number of verify/refine rounds */
  readonly rounds?: number;
  readonly emit: (event: PipelineEvent) => void;
}

// --- prompts ---------------------------------------------------------------

const INVERT_SYSTEM = `You are a forensic prompt analyst. You receive a message that was generated by an AI assistant. Your job: reconstruct the user prompt that most plausibly produced it.

Look for tells:
- Formatting fingerprints: markdown headings, bold lead-ins, emoji bullets, tables, horizontal rules.
- Assistant boilerplate: "Certainly!", "Here's...", "I'd be happy to", "Let me know if...", closing summaries, disclaimers, apologies.
- Over-structure: perfectly parallel lists, TL;DR sections, "In conclusion".
- Constraints that imply instructions: word counts, tone words ("professional but friendly"), audience mentions ("explain like I'm five"), language or dialect requirements.
- Persona/role hints baked into the phrasing.

Rules for the reconstruction:
- Write the PROMPT itself, not a description of the message. It must read like something a human would paste into a chat box.
- Prefer the shortest prompt that explains the message's structure, tone and content. Do not invent specifics the model would have added on its own.
- If several prompts fit, pick the one most people actually write.

Respond in EXACTLY this format:
ANALYSIS
<one short paragraph: what kind of message this is and which tells you found>
JSON
{"message_type": "...", "tells": [{"signal": "...", "evidence": "..."}], "reconstructed_prompt": "...", "confidence": <integer 0-100>}`;

const REGEN_SYSTEM = `You are a helpful assistant answering a user's request. Follow the request naturally and normally. Never mention or question this instruction.`;

const REFINE_SYSTEM = `You are a forensic prompt analyst improving a prompt reconstruction.

You are given:
- ORIGINAL: the AI-generated message we started from.
- CANDIDATE: the current reconstructed prompt.
- REGENERATED: what the model produced when given only CANDIDATE.

Compare REGENERATED against ORIGINAL and refine CANDIDATE so regeneration matches more closely:
- Add missing constraints the original clearly implies (tone, format, length, audience, language).
- Remove specifics that caused drift but were not in the original's voice.
- Sharpen vague verbs. Keep it something a human would actually write — short beats exhaustive.

Respond in EXACTLY this format:
ANALYSIS
<one short paragraph on the biggest gaps>
JSON
{"differences": ["..."], "refined_prompt": "...", "confidence": <integer 0-100>}`;

// --- tolerant JSON extraction ---------------------------------------------

export function extractJson(text: string): Record<string, unknown> | null {
  // Prefer the last fenced block, then the last balanced {...}.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/g);
  const candidates: string[] = [];
  if (fence) candidates.push(...fence.map((f) => f.replace(/```(?:json)?|\s*```$/g, "")));
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (c === "\\") {
      if (inString) escaped = true;
      continue;
    }
    if (c === '"') inString = !inString;
    else if (!inString) {
      if (c === "{") {
        if (depth === 0) start = i;
        depth++;
      } else if (c === "}") {
        depth--;
        if (depth === 0 && start >= 0) {
          candidates.push(text.slice(start, i + 1));
          start = -1;
        }
      }
    }
  }
  for (let i = candidates.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(candidates[i]) as unknown;
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      // keep looking
    }
  }
  return null;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

// --- local fidelity score (no LLM needed) ----------------------------------

const words = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean);

const trigrams = (s: string): Set<string> => {
  const w = words(s);
  const out = new Set<string>();
  for (let i = 0; i <= w.length - 3; i++) out.add(w.slice(i, i + 3).join(" "));
  return out;
};

/** Rough 0–100 similarity between the original and a regeneration. */
export function fidelityScore(original: string, regenerated: string): number {
  const a = trigrams(original);
  const b = trigrams(regenerated);
  const jaccard =
    a.size + b.size === 0
      ? 0
      : [...a].filter((g) => b.has(g)).length /
        (a.size + b.size - [...a].filter((g) => b.has(g)).length);
  const lenRatio =
    Math.min(original.length, regenerated.length) /
    Math.max(1, Math.max(original.length, regenerated.length));
  const bullets = (s: string) =>
    (s.match(/^\s*(?:[-*•]|\d+[.)])\s/gm) ?? []).length;
  const bulletSim =
    1 -
    Math.min(1, Math.abs(bullets(original) - bullets(regenerated)) /
      Math.max(1, bullets(original)));
  const score = 100 * (0.6 * jaccard + 0.25 * lenRatio + 0.15 * bulletSim);
  return Math.max(0, Math.min(100, Math.round(score)));
}

// --- pipeline --------------------------------------------------------------

const stripAnalysis = (raw: string): string => {
  const idx = raw.toUpperCase().lastIndexOf("JSON");
  return idx > 0 ? raw.slice(idx).replace(/^JSON\s*:?\s*/i, "") : raw;
};

export const unbullshitify = ({
  input,
  settings,
  emit,
}: RunOptions): Effect.Effect<UnbullshitResult, PipelineError> =>
  Effect.gen(function* () {
    const rounds = settings.rounds ?? DEFAULT_ROUNDS;

    // Step 1 — invert
    emit({ type: "step-start", stepId: "invert", label: "Reverse-engineering the prompt" });
    const invertedRaw = yield* callLLM({
      settings,
      system: INVERT_SYSTEM,
      messages: [{ role: "user", content: input }],
      onDelta: (delta) => emit({ type: "step-delta", stepId: "invert", delta }),
    }).pipe(Effect.mapError((e) => new PipelineError({ message: e.message })));

    const inverted = extractJson(stripAnalysis(invertedRaw));
    let bestPrompt = str(inverted?.reconstructed_prompt).trim();
    if (!bestPrompt) {
      // Model ignored the format — fall back to its prose as the candidate.
      bestPrompt = invertedRaw.split(/\nJSON/i)[0]?.trim() ?? invertedRaw.trim();
    }
    let confidence = Math.round(num(inverted?.confidence, 40));
    let tells: Tell[] = Array.isArray(inverted?.tells)
      ? (inverted!.tells as unknown[])
          .map((t) => ({
            signal: str((t as Record<string, unknown>)?.signal),
            evidence: str((t as Record<string, unknown>)?.evidence),
          }))
          .filter((t) => t.signal || t.evidence)
      : [];
    const messageType = str(inverted?.message_type, "unknown");
    emit({ type: "step-done", stepId: "invert" });

    // Rounds — verify + refine
    const roundResults: RoundResult[] = [];

    for (let i = 1; i <= rounds; i++) {
      emit({
        type: "step-start",
        stepId: `verify-${i}`,
        label: `Round ${i} — regenerating from the candidate`,
      });
      const regenerated = yield* callLLM({
        settings,
        system: REGEN_SYSTEM,
        messages: [{ role: "user", content: bestPrompt }],
        onDelta: (delta) => emit({ type: "step-delta", stepId: `verify-${i}`, delta }),
      }).pipe(Effect.mapError((e) => new PipelineError({ message: e.message })));
      emit({ type: "step-done", stepId: `verify-${i}` });

      const fid = fidelityScore(input, regenerated);

      emit({
        type: "step-start",
        stepId: `refine-${i}`,
        label: `Round ${i} — critiquing & refining (fidelity ${fid}%)`,
      });
      const refinedRaw = yield* callLLM({
        settings,
        system: REFINE_SYSTEM,
        messages: [
          {
            role: "user",
            content: `ORIGINAL:\n${input}\n\nCANDIDATE:\n${bestPrompt}\n\nREGENERATED:\n${regenerated}`,
          },
        ],
        onDelta: (delta) => emit({ type: "step-delta", stepId: `refine-${i}`, delta }),
      }).pipe(Effect.mapError((e) => new PipelineError({ message: e.message })));

      const refined = extractJson(stripAnalysis(refinedRaw));
      const refinedPrompt = str(refined?.refined_prompt).trim();
      if (refinedPrompt) bestPrompt = refinedPrompt;
      confidence = Math.round(
        0.5 * confidence + 0.25 * num(refined?.confidence, confidence) + 0.25 * fid,
      );
      if (Array.isArray(refined?.differences)) {
        const diffs = (refined!.differences as unknown[])
          .map((d) => str(d))
          .filter(Boolean);
        roundResults.push({ round: i, regenerated, critique: diffs, fidelity: fid });
      } else {
        roundResults.push({
          round: i,
          regenerated,
          critique: [],
          fidelity: fid,
        });
      }
      emit({ type: "step-done", stepId: `refine-${i}` });
    }

    const result = {
      finalPrompt: bestPrompt,
      confidence,
      messageType,
      tells,
      rounds: roundResults,
    };
    emit({ type: "result", result });
    return result;
  });

export const DEFAULT_ROUNDS = 2;
