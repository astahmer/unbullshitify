import { useMemo, useState } from "react";
import { Combobox } from "@/components/kumo";
import { presetById, type Settings } from "@/lib/settings";

/**
 * Swappable model picker for the current provider. Shows the known model
 * catalog for the active preset plus the currently-set custom value, and
 * allows free-text entry of any other model id.
 */
export function ModelPicker({
  settings,
  disabled,
  onChange,
}: {
  settings: Settings;
  disabled?: boolean;
  onChange: (model: string) => void;
}) {
  const preset = presetById(settings.presetId);
  const [query, setQuery] = useState("");

  const items = useMemo(
    () => [...new Set([...(preset?.models ?? []), settings.model].filter(Boolean))],
    [preset, settings.model],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((m) => m.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <Combobox
      value={settings.model}
      onValueChange={(v) => v && onChange(v)}
      items={filtered}
      onInputValueChange={(inputValue) => setQuery(inputValue ?? "")}
    >
      <Combobox.TriggerInput
        placeholder="model id"
        aria-label="Model"
        disabled={disabled}
        className="w-52 font-mono text-xs"
      />
      <Combobox.Content>
        <Combobox.Empty>No matching model — type any id</Combobox.Empty>
        <Combobox.List>
          {(item: string) => (
            <Combobox.Item key={item} value={item} className="font-mono text-xs">
              {item}
            </Combobox.Item>
          )}
        </Combobox.List>
      </Combobox.Content>
    </Combobox>
  );
}
