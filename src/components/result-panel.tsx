import { useState } from "react";
import { CaretDown, Fingerprint, Gauge, Terminal } from "@phosphor-icons/react";
import { Badge } from "@/components/kumo";
import { CopyButton } from "@/components/copy-button";
import type { RoundResult, UnbullshitResult } from "@/lib/pipeline";
import { cn } from "@/components/kumo/utils/cn";

function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 70
      ? "bg-kumo-success"
      : value >= 40
        ? "bg-kumo-warning"
        : "bg-kumo-danger";
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 w-28 overflow-hidden rounded-full bg-kumo-tint"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Confidence"
      >
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium text-kumo-subtle">{value}% confidence</span>
    </div>
  );
}

function RoundCard({ round }: { round: RoundResult }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg ring ring-kumo-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-kumo-tint"
      >
        <span className="flex items-center gap-2 text-xs">
          <span className="font-medium text-kumo-default">Round {round.round}</span>
          <Badge
            variant={
              round.fidelity >= 70 ? "success" : round.fidelity >= 40 ? "warning" : "neutral"
            }
           
          >
            fidelity {round.fidelity}%
          </Badge>
          {round.critique.length > 0 && (
            <span className="text-kumo-subtle">{round.critique.length} fixes</span>
          )}
        </span>
        <CaretDown
          className={cn("size-4 text-kumo-subtle transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="space-y-2 border-t border-kumo-line p-3">
          {round.critique.length > 0 && (
            <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-kumo-subtle">
              {round.critique.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-kumo-subtle">
              Regenerated from candidate
            </p>
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-kumo-tint p-2.5 text-xs leading-relaxed text-kumo-default">
              {round.regenerated}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export function ResultPanel({ result }: { result: UnbullshitResult }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ConfidenceBar value={result.confidence} />
        <div className="flex items-center gap-2">
          {result.messageType && result.messageType !== "unknown" && (
            <Badge variant="neutral">
              {result.messageType}
            </Badge>
          )}
          <CopyButton text={result.finalPrompt} label="Copy prompt" />
        </div>
      </div>

      <div className="relative">
        <Terminal className="absolute right-3 top-3 size-3.5 text-kumo-inactive" />
        <pre className="max-h-[22rem] overflow-y-auto whitespace-pre-wrap rounded-lg bg-kumo-elevated p-4 pr-9 font-mono text-sm leading-relaxed text-kumo-strong ring ring-kumo-brand/30">
          {result.finalPrompt}
        </pre>
      </div>

      {result.tells.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-kumo-subtle">
            <Fingerprint className="size-3.5" /> Detected tells
          </p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {result.tells.map((t, i) => (
              <li
                key={i}
                className="rounded-md bg-kumo-tint p-2.5 text-xs leading-relaxed text-kumo-default"
                title={t.evidence}
              >
                <span className="font-medium">{t.signal}</span>
                {t.evidence && (
                  <span className="block truncate text-kumo-subtle">“{t.evidence}”</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.rounds.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-kumo-subtle">
            <Gauge className="size-3.5" /> Refinement rounds
          </p>
          <div className="space-y-2">
            {result.rounds.map((r) => (
              <RoundCard key={r.round} round={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
