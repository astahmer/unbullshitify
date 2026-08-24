import { useMemo, useState } from "react";
import { ClockCounterClockwise, Trash } from "@phosphor-icons/react";
import { Badge, Button } from "@/components/kumo";
import { clearHistory, timeAgo, type HistoryEntry } from "@/lib/share";

export function HistoryPanel({
  entries,
  onRestore,
  onClear,
}: {
  entries: HistoryEntry[];
  /** restore a run into the output panel (input text is returned too) */
  onRestore: (entry: HistoryEntry) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const sorted = useMemo(() => [...entries].sort((a, b) => b.ts - a.ts), [entries]);

  if (sorted.length === 0) return null;

  return (
    <div className="rounded-lg bg-kumo-base shadow-xs ring ring-kumo-line">
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-sm font-medium text-kumo-default"
        >
          <ClockCounterClockwise className="size-4 text-kumo-subtle" />
          History
          <Badge variant="neutral">{sorted.length}</Badge>
        </button>
        <Button
          variant="ghost"
          size="xs"
          icon={<Trash />}
          onClick={() => {
            clearHistory();
            onClear();
          }}
          aria-label="Clear history"
        >
          Clear
        </Button>
      </div>
      {open && (
        <ul className="divide-y divide-kumo-line border-t border-kumo-line">
          {sorted.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onRestore(e)}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left hover:bg-kumo-tint"
                title={e.input.slice(0, 200)}
              >
                <span className="w-14 shrink-0 text-xs tabular-nums text-kumo-subtle">
                  {timeAgo(e.ts)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-kumo-default">
                  {e.result.finalPrompt}
                </span>
                <Badge variant="neutral" className="shrink-0">
                  {e.result.confidence}%
                </Badge>
                <span className="hidden w-40 shrink-0 truncate font-mono text-[11px] text-kumo-subtle md:block">
                  {e.model}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
