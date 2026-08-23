import { useState } from "react";
import { ChevronDown, Fingerprint, Gauge, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import type { RoundResult, UnbullshitResult } from "@/lib/pipeline";
import { cn } from "@/lib/utils";

function ConfidenceBar({ value }: { value: number }) {
  const hue = value >= 70 ? "bg-primary" : value >= 40 ? "bg-yellow-500" : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full rounded-full transition-all", hue)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium text-muted-foreground">{value}% confidence</span>
    </div>
  );
}

function RoundCard({ round }: { round: RoundResult }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-border/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left"
      >
        <span className="flex items-center gap-2 text-xs">
          <span className="font-medium">Round {round.round}</span>
          <Badge variant={round.fidelity >= 70 ? "default" : round.fidelity >= 40 ? "secondary" : "outline"}>
            fidelity {round.fidelity}%
          </Badge>
          {round.critique.length > 0 && (
            <span className="text-muted-foreground">{round.critique.length} fixes</span>
          )}
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-border/60 p-3">
          {round.critique.length > 0 && (
            <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
              {round.critique.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Regenerated from candidate
            </p>
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/50 p-2.5 text-xs leading-relaxed">
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
            <Badge variant="outline">{result.messageType}</Badge>
          )}
          <CopyButton text={result.finalPrompt} label="Copy prompt" />
        </div>
      </div>

      <div className="relative">
        <Terminal className="absolute right-3 top-3 size-3.5 text-muted-foreground/50" />
        <pre className="max-h-[22rem] overflow-y-auto whitespace-pre-wrap rounded-lg border border-primary/25 bg-primary/[0.04] p-4 pr-9 font-mono text-sm leading-relaxed">
          {result.finalPrompt}
        </pre>
      </div>

      {result.tells.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Fingerprint className="size-3.5" /> Detected tells
          </p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {result.tells.map((t, i) => (
              <li
                key={i}
                className="rounded-md border border-border/60 bg-muted/30 p-2.5 text-xs leading-relaxed"
                title={t.evidence}
              >
                <span className="font-medium">{t.signal}</span>
                {t.evidence && (
                  <span className="block truncate text-muted-foreground">“{t.evidence}”</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.rounds.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
