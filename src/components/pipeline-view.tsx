import { Check, Lightning } from "@phosphor-icons/react";
import { Loader } from "@/components/kumo/components/loader";
import { cn } from "@/components/kumo/utils/cn";
import type { StepState } from "@/hooks/use-unbullshitify";

function StepRow({ step }: { step: StepState }) {
  return (
    <div className="relative pl-7">
      <span className="absolute left-0 top-0.5 flex size-5 items-center justify-center">
        {step.status === "running" ? (
          <Loader size="sm" aria-label="Running" />
        ) : (
          <span className="flex size-5 items-center justify-center rounded-full bg-kumo-success/15">
            <Check className="size-3 text-kumo-success" weight="bold" />
          </span>
        )}
      </span>
      <p
        className={cn(
          "text-sm font-medium",
          step.status === "running"
            ? "text-kumo-default"
            : "text-kumo-subtle",
        )}
      >
        {step.label}
      </p>
      {step.streamedText && (
        <pre className="mt-1.5 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-kumo-tint p-2.5 font-mono text-xs leading-relaxed text-kumo-subtle">
          {step.streamedText.length > 1200
            ? "…" + step.streamedText.slice(-1200)
            : step.streamedText}
        </pre>
      )}
    </div>
  );
}

export function PipelineView({ steps }: { steps: StepState[] }) {
  if (steps.length === 0) return null;
  return (
    <div className="space-y-4">
      {steps.map((s) => (
        <StepRow key={s.stepId} step={s} />
      ))}
    </div>
  );
}

export function RunningHint() {
  return (
    <p className="flex items-center gap-2 text-xs text-kumo-subtle">
      Round-tripping through the model — each round regenerates from the
      candidate and refines it.
    </p>
  );
}

export function IdleHint() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-kumo-line px-6 py-10 text-center">
      <Lightning weight="fill" className="size-6 text-kumo-inactive" />
      <div>
        <p className="text-sm font-medium text-kumo-subtle">No output yet</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-kumo-subtle/80">
          Paste a message on the left and hit Unbullshitify. The pipeline drafts
          a candidate prompt, regenerates from it alone, diffs against the
          original, and refines each round.
        </p>
      </div>
    </div>
  );
}
