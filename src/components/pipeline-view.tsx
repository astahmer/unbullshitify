import { Check, Loader, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StepState } from "@/hooks/use-unbullshitify";

function StepRow({ step }: { step: StepState }) {
  return (
    <div className="relative pl-7">
      <span className="absolute left-0 top-0.5 flex size-5 items-center justify-center">
        {step.status === "running" ? (
          <span className="spinner-small block" aria-hidden />
        ) : (
          <span className="flex size-5 items-center justify-center rounded-full bg-primary/15">
            <Check className="size-3 text-primary" />
          </span>
        )}
      </span>
      <p
        className={cn(
          "text-sm font-medium",
          step.status === "running" ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {step.label}
      </p>
      {step.streamedText && (
        <pre className="mt-1.5 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md border border-border/60 bg-muted/50 p-2.5 font-mono text-xs leading-relaxed text-muted-foreground">
          {step.streamedText.length > 1200
            ? step.streamedText.slice(-1200)
            : step.streamedText}
        </pre>
      )}
    </div>
  );
}

export function PipelineView({ steps }: { steps: StepState[] }) {
  if (steps.length === 0) return null;
  return (
    <div className="space-y-4 border-l-0 pl-0">
      {steps.map((s) => (
        <StepRow key={s.stepId} step={s} />
      ))}
    </div>
  );
}

export function RunningHint() {
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <Loader className="size-3.5 animate-spin" />
      Round-tripping through the model — each round regenerates from the
      candidate prompt and refines it.
    </p>
  );
}

export function IdleHint() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
      <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
      The pipeline: analyze the message's tells → draft a candidate prompt →
      regenerate from that candidate alone → diff against the original → refine.
      Each round tightens the reconstruction; the local fidelity score tracks
      convergence without extra API calls.
    </div>
  );
}
