import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, RotateCcw, Settings2, Square, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
    <div className="min-h-screen">
      <div className="bg-grid pointer-events-none fixed inset-0" aria-hidden />

      <header className="relative border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
          <h1 className="flex items-baseline gap-2 text-lg font-bold tracking-tight">
            unbullshitify
            <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
              GPT output → original prompt
            </span>
          </h1>
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings2 />
            {configured ? (
              <span className="flex items-center gap-1.5">
                {presetName}
                <span className="size-1.5 rounded-full bg-primary" title={redactKey(activeApiKey(settings))} />
              </span>
            ) : (
              <span className="text-destructive">Add API key</span>
            )}
          </Button>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl space-y-4 px-4 py-6">
        {!configured && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/[0.06] px-4 py-3 text-sm">
            <p>
              <span className="font-medium">Bring your own key.</span> Everything
              runs client-side — pick a provider, paste an OpenAI-compatible key,
              done.
            </p>
            <Button size="sm" onClick={() => setSettingsOpen(true)}>
              Configure
            </Button>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          {/* Input */}
          <Card className="self-start">
            <CardHeader>
              <CardTitle>The bullshit</CardTitle>
              <CardDescription>
                Paste a message that smells AI-generated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste the GPT-generated message here…"
                className="min-h-[220px] resize-y"
                spellCheck={false}
              />
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Refine rounds
                  <Select
                    value={String(settings.rounds)}
                    disabled={running}
                    onChange={(e) =>
                      setSettings((s) => {
                        const next = { ...s, rounds: Number(e.target.value) };
                        saveSettings(next);
                        return next;
                      })
                    }
                    className="h-7 w-[4.5rem] text-xs"
                  >
                    {[0, 1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                </label>
                <span className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInput(EXAMPLE)}
                    className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    try an example
                  </button>
                  {input.length > 0 && (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {input.length.toLocaleString()}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {running ? (
                  <>
                    <Button variant="destructive" onClick={cancel}>
                      <Square /> Stop
                    </Button>
                    <RunningHint />
                  </>
                ) : (
                  <>
                    <Button disabled={!canRun} onClick={() => run(input)}>
                      <Wand2 /> Unbullshitify
                    </Button>
                    {state.status === "done" || state.status === "error" ? (
                      <Badge variant="outline">finished</Badge>
                    ) : null}
                  </>
                )}
              </div>
              {input.trim().length > 0 && input.trim().length <= 40 && (
                <p className="text-xs text-muted-foreground">
                  A bit short — longer messages give the analysis more tells to work with.
                </p>
              )}
              {state.error && (
                <p className="flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs leading-relaxed text-destructive">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  {state.error}
                </p>
              )}
              {state.status === "cancelled" && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RotateCcw className="size-3" /> Cancelled — partial results above.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pipeline + result */}
          <Card>
            <CardHeader>
              <CardTitle>Reverse-engineered prompt</CardTitle>
              <CardDescription>
                Round-trip inversion: draft → regenerate → diff → refine.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {state.steps.length > 0 ? (
                <PipelineView steps={state.steps} />
              ) : (
                <IdleHint />
              )}
              {state.result && (
                <>
                  <hr className="border-border/60" />
                  <ResultPanel result={state.result} />
                </>
              )}
              {state.status === "idle" &&
                state.steps.length === 0 &&
                input.length === 0 && (
                  <p className="text-right text-xs text-muted-foreground">
                    Your key stays in your browser ·{" "}
                    <CopyButton
                      text={window.location.href}
                      label="Share app"
                      className="ml-1"
                    />
                  </p>
                )}
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="relative mx-auto max-w-5xl px-4 pb-8 pt-2 text-center text-xs text-muted-foreground">
        Approximate reconstruction — prompts are guessed from stylistic and
        structural evidence, not extracted verbatim.
      </footer>

      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
