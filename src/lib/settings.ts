export interface Settings {
  presetId: string;
  baseURL: string;
  apiKey: string;
  model: string;
  rounds: number;
}

export interface ProviderPreset {
  id: string;
  name: string;
  baseURL: string;
  models: string[];
  keyUrl?: string;
}

/**
 * Any OpenAI-compatible endpoint works. The API key is kept in localStorage and
 * sent directly from the browser to the provider — there is no backend.
 */
export const PRESETS: ProviderPreset[] = [
  {
    id: "openai",
    name: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    models: ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini", "gpt-4o"],
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    models: [
      "anthropic/claude-sonnet-4.5",
      "openai/gpt-4.1-mini",
      "google/gemini-2.5-flash",
      "deepseek/deepseek-chat-v3.1",
    ],
    keyUrl: "https://openrouter.ai/settings/keys",
  },
  {
    id: "groq",
    name: "Groq",
    baseURL: "https://api.groq.com/openai/v1",
    models: ["llama-3.3-70b-versatile", "moonshotai/kimi-k2-instruct"],
    keyUrl: "https://console.groq.com/keys",
  },
  {
    id: "mistral",
    name: "Mistral",
    baseURL: "https://api.mistral.ai/v1",
    models: ["mistral-large-latest", "mistral-small-latest"],
    keyUrl: "https://console.mistral.ai/api-keys",
  },
  {
    id: "ollama",
    name: "Ollama (local)",
    baseURL: "http://localhost:11434/v1",
    models: ["llama3.2", "qwen3", "mistral-small"],
  },
  {
    id: "custom",
    name: "Custom…",
    baseURL: "",
    models: [],
  },
];

const STORAGE_KEY = "unbullshitify.settings.v1";

export const DEFAULT_SETTINGS: Settings = {
  presetId: "openrouter",
  baseURL: PRESETS[1].baseURL,
  apiKey: "",
  model: "anthropic/claude-sonnet-4.5",
  rounds: 2,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
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
