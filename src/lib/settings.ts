export interface Settings {
  presetId: string;
  baseURL: string;
  model: string;
  rounds: number;
  /** one key per provider preset, so switching providers keeps keys */
  apiKeys: Record<string, string>;
}

export interface ProviderPreset {
  id: string;
  name: string;
  baseURL: string;
  models: string[];
  keyUrl?: string;
}

/**
 * Any OpenAI-compatible endpoint works. Keys are kept in localStorage and sent
 * directly from the browser to the provider — there is no backend.
 */
export const PRESETS: ProviderPreset[] = [
  {
    id: "openai",
    name: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    models: [
      "gpt-5.2",
      "gpt-5-mini",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4o",
      "gpt-4o-mini",
      "o4-mini",
    ],
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    models: [
      "anthropic/claude-sonnet-4.5",
      "anthropic/claude-haiku-4.5",
      "openai/gpt-5.2",
      "openai/gpt-4.1-mini",
      "google/gemini-3-pro",
      "google/gemini-2.5-flash",
      "deepseek/deepseek-chat-v3.1",
      "x-ai/grok-4",
      "moonshotai/kimi-k2",
      "meta-llama/llama-4-maverick",
    ],
    keyUrl: "https://openrouter.ai/settings/keys",
  },
  {
    id: "groq",
    name: "Groq",
    baseURL: "https://api.groq.com/openai/v1",
    models: [
      "llama-3.3-70b-versatile",
      "moonshotai/kimi-k2-instruct",
      "openai/gpt-oss-120b",
      "qwen/qwen3-32b",
    ],
    keyUrl: "https://console.groq.com/keys",
  },
  {
    id: "mistral",
    name: "Mistral",
    baseURL: "https://api.mistral.ai/v1",
    models: [
      "mistral-large-latest",
      "mistral-small-latest",
      "magistral-medium-latest",
    ],
    keyUrl: "https://console.mistral.ai/api-keys",
  },
  {
    id: "ollama",
    name: "Ollama (local)",
    baseURL: "http://localhost:11434/v1",
    models: [
      "llama3.2",
      "llama3.1",
      "qwen3",
      "qwen2.5",
      "mistral-small",
      "gemma3",
    ],
  },
  {
    id: "custom",
    name: "Custom…",
    baseURL: "",
    models: [],
  },
];

const STORAGE_KEY = "unbullshitify.settings.v2";

export const DEFAULT_SETTINGS: Settings = {
  presetId: "openrouter",
  baseURL: PRESETS[1].baseURL,
  model: "anthropic/claude-sonnet-4.5",
  rounds: 2,
  apiKeys: {},
};

export function activeApiKey(settings: Settings): string {
  return settings.apiKeys?.[settings.presetId] ?? "";
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    // migrate v1 single-key storage if present
    const legacy = localStorage.getItem("unbullshitify.settings.v1");
    let migratedKeys: Record<string, string> | undefined;
    if (legacy) {
      try {
        const v1 = JSON.parse(legacy) as { presetId?: string; apiKey?: string };
        if (v1.presetId && v1.apiKey) {
          migratedKeys = { [v1.presetId]: v1.apiKey };
        }
      } catch {
        // ignore corrupt legacy data
      }
    }
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      apiKeys: { ...(migratedKeys ?? {}), ...(parsed.apiKeys ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function presetById(id: string): ProviderPreset | undefined {
  return PRESETS.find((p) => p.id === id);
}

/** sk-proj-abcd…wxyz — for display only, never logged anywhere else. */
export function redactKey(key: string): string {
  if (!key) return "";
  if (key.length <= 12) return "•".repeat(key.length);
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}
