import { useCallback, useMemo, useState } from "react";
import {
  ArrowClockwise,
  ArrowRight,
  Key,
  Lightbulb,
  MagicWand,
  ShieldCheck,
  Stop,
  Warning,
} from "@phosphor-icons/react";
import { Badge, Button, Select, Textarea, Tooltip, TooltipProvider } from "@/components/kumo";
import { CopyButton } from "@/components/copy-button";
import { SettingsDialog } from "@/components/settings-dialog";
import { IdleHint, PipelineView, RunningHint } from "@/components/pipeline-view";
import { ResultPanel } from "@/components/result-panel";
import { useUnbullshitify } from "@/hooks/use-unbullshitify";
import {
  activeApiKey,
  loadSettings,
  presetById,
  redactKey,
  saveSettings,
  type Settings,
} from "@/lib/settings";

const EXAMPLE = `Great question! I'd be happy to help you with that. 🚀

Here's a breakdown of the key considerations for migrating your monolith to microservices:

**1. Assess Your Current Architecture**
Before diving in, it's crucial to understand your existing system's boundaries and data flows.

**2. Start with a Strangler Fig Pattern**
Rather than a big-bang rewrite (which is often risky!), consider incrementally extracting services.

**3. Don't Forget Observability!**
Distributed systems require robust logging, tracing, and metrics from day one.

TL;DR: Start small, automate everything, and iterate. Let me know if you'd like me to elaborate on any of these points! 😊`;

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [input, setInput] = useState("");

  const { state, run, cancel } = useUnbullshitify(settings);

  const configured = Boolean(
    activeApiKey(settings) && settings.baseURL && settings.model,
  );
  const running = state.status === "running";
  const canRun = configured && input.trim().length > 40 && !running;

  const handleSave = useCallback((s: Settings) => {
    setSettings(s);
    saveSettings(s);
  }, []);

  const presetName = useMemo(
    () => presetById(settings.presetId)?.name ?? settings.presetId,
    [settings.presetId],
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-kumo-canvas text-kumo-default">
        <div className="bg-grid pointer-events-none fixed inset-0" aria-hidden />

        {/* Top bar */}
        <header className="sticky top-0 z-10 border-b border-kumo-line bg-kumo-canvas/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-baseline gap-3">
              <h1 className="text-lg font-bold tracking-tight">unbullshitify</h1>
              <span className="hidden text-xs text-kumo-subtle sm:inline">
                GPT output → original prompt
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!configured && (
                <Badge variant="warning">
                  No API key
                </Badge>
              )}
              <Tooltip
                content={
                  configured
                    ? `Key configured (${redactKey(activeApiKey(settings))})`
                    : "No API key yet"
                }
                render={
                  <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} />
                }
              >
                <Key weight="fill" />
                {configured ? (
                  <>
                    {presetName}
                    <span className="inline-block size-1.5 rounded-full bg-kumo-success" />
                  </>
                ) : (
                  <>
                    Set API key
                    <span className="inline-block size-1.5 rounded-full bg-kumo-warning" />
                  </>
                )}
              </Tooltip>
            </div>
          </div>
        </header>

        <main className="relative mx-auto max-w-6xl space-y-4 px-4 py-6">
          {!configured && (
            <div className="rounded-lg bg-kumo-brand/10 p-3.5 text-sm">
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-kumo-success" />
                <span>
                  <span className="font-medium">Bring your own key.</span>{" "}
                  <span className="text-kumo-subtle">
                    Everything runs in your browser — requests go straight to
                    your provider, keys never leave this device.
                  </span>
                </span>
              </p>
            </div>
          )}

          {/* Two-column workspace */}
          <div className="relative grid items-start gap-4 lg:grid-cols-2">
            {/* Input → Output connector */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 z-0 hidden -translate-x-1/2 -translate-y-1/2 lg:block"
              aria-hidden
            >
              <ArrowRight weight="bold" className="size-6 text-kumo-inactive" />
            </div>

            {/* Input */}
            <section className="flex h-full flex-col rounded-lg bg-kumo-base p-5 shadow-xs ring ring-kumo-line lg:col-start-1" aria-label="Input">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="font-semibold">The bullshit</h2>
                <button
                  type="button"
                  onClick={() =>
                    setInput((prev) =>
                      prev ? `${prev}\n\n${EXAMPLE}` : EXAMPLE,
                    )
                  }
                  disabled={running}
                  className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-xs text-kumo-link hover:underline disabled:opacity-50"
                >
                  <Lightbulb className="size-3.5" />
                  paste example
                </button>
              </div>

              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste the GPT-generated message here…"
                rows={9}
                autoResize={false}
                spellCheck={false}
                aria-label="Message to reverse-engineer"
              />

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="flex items-center gap-2 text-sm text-kumo-subtle">
                  <Tooltip
                    content="Each round regenerates from the candidate prompt and refines it. More rounds = sharper result, more API calls."
                    side="top"
                    render={<span tabIndex={0} />}
                  >
                    Refine rounds
                  </Tooltip>
                  <Select
                      value={String(settings.rounds)}
                      disabled={running}
                      onValueChange={(v) => {
                        if (v === null) return;
                        setSettings((s) => {
                          const next = { ...s, rounds: Number(v) };
                          saveSettings(next);
                          return next;
                        });
                      }}
                      size="xs"
                      aria-label="Number of refinement rounds"
                      items={{
                        "0": "0",
                        "1": "1",
                        "2": "2 (recommended)",
                        "3": "3",
                        "4": "4",
                      }}
                      className="w-[9.5rem]"
                    />
                  </label>
                <div className="ml-auto flex items-center gap-2">
                  {input.length > 0 && (
                    <span className="text-xs tabular-nums text-kumo-subtle">
                      {input.length.toLocaleString()} chars
                    </span>
                  )}
                  {state.status === "done" && !running && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ArrowClockwise />}
                      onClick={() => run(input)}
                    >
                      Re-run
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                {running ? (
                  <>
                    <Button variant="secondary-destructive" onClick={cancel}>
                      <Stop weight="fill" /> Stop
                    </Button>
                    <RunningHint />
                  </>
                ) : (
                  <>
                    {!configured ? (
                      <Button
                        variant="primary"
                        onClick={() => setSettingsOpen(true)}
                      >
                        <Key weight="fill" /> Add API key to start
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        disabled={!canRun}
                        onClick={() => run(input)}
                      >
                        <MagicWand weight="fill" /> Unbullshitify
                      </Button>
                    )}
                  </>
                )}
              </div>

              {input.trim().length > 0 && input.trim().length <= 40 && !running && (
                <p className="mt-2 text-xs text-kumo-warning">
                  A bit short — longer messages give the analysis more tells to work with.
                </p>
              )}
              {state.error && (
                <p className="mt-3 flex items-start gap-1.5 rounded-md bg-kumo-danger/10 p-2.5 text-xs leading-relaxed text-kumo-danger ring ring-kumo-danger/30">
                  <Warning className="mt-0.5 size-3.5 shrink-0" />
                  {state.error}
                </p>
              )}
              {state.status === "cancelled" && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-kumo-subtle">
                  Cancelled — partial results kept on the right.
                </p>
              )}
            </section>

            {/* Output */}
            <section
              className="relative z-10 flex h-full flex-col rounded-lg bg-kumo-base p-5 shadow-xs ring ring-kumo-line"
              aria-label="Result"
            >
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="font-semibold">Reverse-engineered prompt</h2>
                {state.result && (
                  <CopyButton text={state.result.finalPrompt} label="Copy prompt" />
                )}
              </div>
              {state.steps.length > 0 ? (
                <PipelineView steps={state.steps} />
              ) : (
                <IdleHint />
              )}
              {state.result && (
                <>
                  <hr className="my-4 border-kumo-line" />
                  <ResultPanel result={state.result} />
                </>
              )}
            </section>
          </div>
        </main>

        <footer className="relative mx-auto max-w-6xl px-4 pb-8 pt-2 text-center text-xs text-kumo-subtle">
          Approximate reconstruction — prompts are inferred from stylistic and
          structural evidence, not extracted verbatim. Keys stay in your browser.
        </footer>

        <SettingsDialog
          open={settingsOpen}
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSave}
        />
      </div>
    </TooltipProvider>
  );
}
