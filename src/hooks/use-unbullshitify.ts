import { useCallback, useEffect, useRef, useState } from "react";
import { Cause, Effect, Exit, Fiber, FiberId, Option } from "effect";
import {
  unbullshitify,
  type PipelineEvent,
  type StepKind,
  type UnbullshitResult,
} from "@/lib/pipeline";
import type { Settings } from "@/lib/settings";
import { pushHistory } from "@/lib/share";

export interface StepState {
  stepId: StepKind;
  label: string;
  status: "running" | "done";
  streamedText: string;
}

export interface RunState {
  status: "idle" | "running" | "done" | "error" | "cancelled";
  steps: StepState[];
  result: UnbullshitResult | null;
  error: string | null;
}

const INITIAL: RunState = { status: "idle", steps: [], result: null, error: null };

export function useUnbullshitify(settings: Settings) {
  const [state, setState] = useState<RunState>(INITIAL);
  const fiberRef = useRef<Fiber.RuntimeFiber<UnbullshitResult, unknown> | null>(
    null,
  );

  useEffect(
    () => () => {
      fiberRef.current?.unsafeInterruptAsFork(FiberId.none);
    },
    [],
  );

  const applyEvent = useCallback((event: PipelineEvent) => {
    setState((prev) => {
      switch (event.type) {
        case "step-start":
          return {
            ...prev,
            status: "running",
            steps: [
              ...prev.steps.map((s) =>
                s.status === "running" ? { ...s, status: "done" as const } : s,
              ),
              {
                stepId: event.stepId,
                label: event.label,
                status: "running" as const,
                streamedText: "",
              },
            ],
          };
        case "step-delta":
          return {
            ...prev,
            steps: prev.steps.map((s) =>
              s.stepId === event.stepId
                ? { ...s, streamedText: s.streamedText + event.delta }
                : s,
            ),
          };
        case "step-done":
          return {
            ...prev,
            steps: prev.steps.map((s) =>
              s.stepId === event.stepId ? { ...s, status: "done" as const } : s,
            ),
          };
        case "result":
          return { ...prev, result: event.result };
      }
    });
  }, []);

  const run = useCallback(
    (input: string) => {
      if (state.status === "running") return;
      setState({ status: "running", steps: [], result: null, error: null });
      // capture the final result for the history record
      let capturedResult: UnbullshitResult | undefined;
      const program = unbullshitify({
        input,
        settings,
        emit: (event) => {
          if (event.type === "result") capturedResult = event.result;
          applyEvent(event);
        },
      }).pipe(
        Effect.onExit((exit) =>
          Effect.sync(() => {
            if (Exit.isSuccess(exit)) {
              if (capturedResult) {
                void pushHistory({
                  input,
                  result: capturedResult,
                  model: settings.model,
                });
              }
              setState((prev) => ({ ...prev, status: "done" }));
            } else if (Cause.isInterruptedOnly(exit.cause)) {
              setState((prev) => ({
                ...prev,
                status: "cancelled",
                steps: prev.steps.map((s) =>
                  s.status === "running" ? { ...s, status: "done" as const } : s,
                ),
              }));
            } else {
              const failure = Cause.failureOption(exit.cause);
              setState((prev) => ({
                ...prev,
                status: "error",
                error: Option.isSome(failure)
                    ? ((failure.value as { message?: string }).message ??
                      "Something went wrong")
                    : "Something went wrong",
              }));
            }
          }),
        ),
      );
      const fiber = Effect.runFork(program);
      fiberRef.current = fiber;
    },
    [settings, state.status, applyEvent],
  );

  /** Hydrate a previous run (history click / shared link). */
  const restore = useCallback((result: UnbullshitResult) => {
    fiberRef.current?.unsafeInterruptAsFork(FiberId.none);
    setState({
      status: "done",
      steps: [],
      result,
      error: null,
    });
  }, []);

  const cancel = useCallback(() => {
    fiberRef.current?.unsafeInterruptAsFork(FiberId.none);
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  return { state, run, cancel, reset, restore };
}
