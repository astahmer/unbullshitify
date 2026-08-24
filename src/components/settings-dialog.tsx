import { useEffect, useState } from "react";
import { Eye, EyeSlash, Key, ShieldCheck, X } from "@phosphor-icons/react";
import { Button, Dialog, Field, Input, Select } from "@/components/kumo";
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
  const currentKey = draft.apiKeys[draft.presetId] ?? "";
  const canSave = Boolean(draft.baseURL && draft.model && currentKey.trim());

  const update = (patch: Partial<Settings>) =>
    setDraft((d) => ({ ...d, ...patch }));

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => !o && onClose()}
    >
      <Dialog className="w-[26rem] p-6">
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-kumo-line pb-3">
          <Dialog.Title className="text-xl font-semibold">
            <span className="flex items-center gap-2">
              <Key className="text-kumo-brand" />
              Provider settings
            </span>
          </Dialog.Title>
          <Dialog.Close
            render={(props) => (
              <Button
                {...props}
                variant="ghost"
                shape="square"
                size="sm"
                icon={<X />}
                aria-label={"Close"}
              />
            )}
          />
        </div>

        <div className="space-y-4">
          <Field label="Provider" description="Any OpenAI-compatible endpoint.">
            <Select
              aria-label="Provider"
              value={draft.presetId}
              onValueChange={(v) => {
                const id = v ?? draft.presetId;
                const p = presetById(id);
                update({
                  presetId: id,
                  baseURL: p?.baseURL ?? draft.baseURL,
                  model:
                    p && p.models.length > 0 && !p.models.includes(draft.model)
                      ? p.models[0]
                      : draft.model,
                });
              }}
              items={Object.fromEntries(
                PRESETS.map((p) => [
                  p.id,
                  `${p.name}${draft.apiKeys[p.id] ? " ✓" : ""}`,
                ]),
              )}
            />
          </Field>

          <Field label="Base URL">
            <Input
              id="baseurl"
              placeholder="https://api.example.com/v1"
              value={draft.baseURL}
              onChange={(e) => update({ baseURL: e.target.value.trim() })}
            />
          </Field>

          <Field label="Model">
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
          </Field>

          <Field
            label={`API key${preset ? ` — ${preset.name}` : ""}`}
            description={
              <span className="flex items-start gap-1.5">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-kumo-success" />
                Stored in this browser only (one per provider) — there is no
                backend.
              </span>
            }
          >
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                placeholder={
                  settings.apiKeys[draft.presetId]
                    ? redactKey(settings.apiKeys[draft.presetId])
                    : "sk-…"
                }
                value={currentKey}
                onChange={(e) =>
                  update({
                    apiKeys: { ...draft.apiKeys, [draft.presetId]: e.target.value },
                  })
                }
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent p-0 text-kumo-subtle hover:text-kumo-default"
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>

          {preset?.keyUrl && (
            <a
              href={preset.keyUrl}
              target="_blank"
              rel="noreferrer"
              className="-mt-2 block text-right text-xs text-kumo-link hover:underline"
            >
              Get a {preset.name} key →
            </a>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!canSave}
              onClick={() => {
                onSave(draft);
                onClose();
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </Dialog>
    </Dialog.Root>
  );
}

