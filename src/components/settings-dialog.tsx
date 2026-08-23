import { useEffect, useState } from "react";
import { Eye, EyeOff, ExternalLink, KeyRound, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  PRESETS,
  type Settings,
  presetById,
  redactKey,
} from "@/lib/settings";

export function SettingsDialog({
  open,
  settings,
  onClose,
  onSave,
}: {
  open: boolean;
  settings: Settings;
  onClose: () => void;
  onSave: (s: Settings) => void;
}) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [showKey, setShowKey] = useState(false);

  // re-sync the form each time the dialog opens
  useEffect(() => {
    if (open) {
      setDraft(settings);
      setShowKey(false);
    }
  }, [open, settings]);

  if (!open) return null;

  const preset = presetById(draft.presetId);

  const update = (patch: Partial<Settings>) =>
    setDraft((d) => ({ ...d, ...patch }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[10vh] backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-popover p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <KeyRound className="size-4 text-primary" />
            Provider settings
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="preset">Provider (OpenAI-compatible)</Label>
            <Select
              id="preset"
              value={draft.presetId}
              onChange={(e) => {
                const p = presetById(e.target.value);
                update({
                  presetId: e.target.value,
                  baseURL: p?.baseURL ?? draft.baseURL,
                  model:
                    p && p.models.length > 0 && !p.models.includes(draft.model)
                      ? p.models[0]
                      : draft.model,
                });
              }}
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="baseurl">Base URL</Label>
            <Input
              id="baseurl"
              placeholder="https://api.example.com/v1"
              value={draft.baseURL}
              onChange={(e) => update({ baseURL: e.target.value.trim() })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              list="model-suggestions"
              placeholder="model id"
              value={draft.model}
              onChange={(e) => update({ model: e.target.value.trim() })}
            />
            <datalist id="model-suggestions">
              {preset?.models.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="apikey">API key</Label>
              {preset?.keyUrl && (
                <a
                  href={preset.keyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                >
                  get a key <ExternalLink className="size-3" />
                </a>
              )}
            </div>
            <div className="relative">
              <Input
                id="apikey"
                type={showKey ? "text" : "password"}
                placeholder={settings.apiKey ? redactKey(settings.apiKey) : "sk-…"}
                value={draft.apiKey}
                onChange={(e) => update({ apiKey: e.target.value })}
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
              Stored in this browser's localStorage only. Requests go straight
              from your browser to the provider — there is no backend.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={!draft.baseURL || !draft.model || !draft.apiKey}
              onClick={() => {
                onSave(draft);
                onClose();
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
