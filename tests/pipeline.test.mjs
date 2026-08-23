// End-to-end pipeline test with a mocked OpenAI-compatible SSE endpoint.
// Run: node tests/pipeline.test.mjs
import { Effect, Exit } from "effect";
import {
  unbullshitify,
  fidelityScore,
  extractJson,
} from "../src/lib/pipeline.ts";

let failures = 0;
const check = (name, cond, extra = "") => {
  console.log(cond ? `  ok  ${name}` : `FAIL  ${name} ${extra}`);
  if (!cond) failures++;
};

// --- unit: extractJson ------------------------------------------------------
check("extractJson picks balanced object", () => {
  const j = extractJson('ANALYSIS\nblah\nJSON\n{"a": {"b": "c}"}, "d": 1}');
  return j?.d === 1 && j?.a?.b === 'c}';
});
check("extractJson handles fenced json", () => {
  const j = extractJson('text ```json\n{"x":2}\n``` trailing');
  return j?.x === 2;
});
check("extractJson returns null on garbage", () => extractJson("no json here") === null);

// --- unit: fidelity ---------------------------------------------------------
check("fidelity identical text = 100", fidelityScore("a b c d e f g", "a b c d e f g") === 100);
check("fidelity unrelated text is low", fidelityScore(
  "certainly! here is a comprehensive overview of microservices migration strategies",
  "the weather in paris is nice during spring",
) < 30);
check("fidelity similar-ish text is mid", (() => {
  const s = fidelityScore(
    "Here are three tips: first plan, then build, then ship.",
    "Three tips: plan first, build next, ship last.",
  );
  return s >= 25 && s <= 85;
})());

// --- e2e: full pipeline over mocked SSE -------------------------------------
const calls = [];

function sseResponse(events) {
  const enc = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      for (const ev of events) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`));
      }
      controller.enqueue(enc.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

function chunk(delta, finish = null) {
  return {
    id: "chatcmpl-test",
    object: "chat.completion.chunk",
    created: 1700000000,
    model: "test-model",
    choices: [{ index: 0, delta, finish_reason: finish }],
  };
}

globalThis.fetch = async (_url, init) => {
  const req = JSON.parse(init.body);
  calls.push({ system: req.messages?.find((m) => m.role === "system")?.content ?? "", user: req.messages?.filter((m) => m.role !== "system").map((m) => m.content).join("|"), stream: req.stream });

  // classify which step this is by the user payload
  const lastUser = req.messages.filter((m) => m.role === "user").at(-1)?.content ?? "";

  if (lastUser.startsWith("Great question!")) {
    // INVERT step
    const parts = [
      'ANALYSIS\nClassic assistant output with boilerplate and emoji bullets.\nJSON\n{"message_type":"how-to answer",',
      ' "tells":[{"signal":"boilerplate","evidence":"I\'d be happy to"}],',
      ' "reconstructed_prompt":"Explain how to migrate a monolith to microservices","confidence":72}',
    ];
    return sseResponse(parts.map((p) => chunk({ content: p })));
  }
  if (lastUser.startsWith("ORIGINAL:")) {
    // REFINE step
    return sseResponse([
      chunk({ content: 'ANALYSIS\ncandidate too vague\nJSON\n' }),
      chunk({ content: '{"differences":["missing tone constraint"],"refined_prompt":"In a friendly tone, explain how to migrate a monolith to microservices for a junior dev","confidence":80}' }),
    ]);
  }
  // VERIFY step (regenerate from candidate)
  return sseResponse([
    chunk({ content: "Sure! Migrating a monolith to microservices involves " }),
    chunk({ content: "assessing boundaries, strangler fig pattern, observability." }),
  ]);
};

const INPUT = `Great question! Here are three tips for migrating your monolith: assess boundaries, use a strangler fig pattern, invest in observability. Let me know if you'd like details!`;

const events = [];
const settings = {
  presetId: "custom",
  baseURL: "https://mock.local/v1",
  apiKey: "sk-test",
  model: "test-model",
  rounds: 1,
};

const exit = await Effect.runPromiseExit(
  unbullshitify({
    input: INPUT,
    settings,
    emit: (e) => events.push(e),
  }),
);

if (Exit.isSuccess(exit)) {
  const r = exit.value;
  console.log(JSON.stringify(r, null, 2).slice(0, 600));
  check("3 LLM calls made (invert/verify/refine)", calls.length === 3, `got ${calls.length}`);
  check("all calls streamed", calls.every((c) => c.stream === true));
  check(
    "invert ran before verify",
    calls[0].user.includes("Great question!") && !calls[0].user.includes("ORIGINAL:"),
  );
  check(
    "verify used candidate prompt",
    calls[1].user.includes("microservices"),
  );
  check(
    "refine saw original+candidate+regen",
    calls[2].user.includes("ORIGINAL:") && calls[2].user.includes("REGENERATED:"),
  );
  check("final prompt is refined one", r.finalPrompt.includes("friendly tone"), r.finalPrompt);
  check("confidence computed", r.confidence > 40 && r.confidence <= 100, String(r.confidence));
  check("tells extracted", r.tells.length === 1 && r.tells[0].signal === "boilerplate");
  check("messageType parsed", r.messageType === "how-to answer");
  check("one round recorded with critique", r.rounds.length === 1 && r.rounds[0].critique.length === 1);
  check("fidelity sane", r.rounds[0].fidelity >= 0 && r.rounds[0].fidelity <= 100);
  check("event sequence has starts/dones", events.some((e) => e.type === "step-start" && e.stepId === "verify-1") && events.some((e) => e.type === "step-done" && e.stepId === "refine-1"));
  check("result event emitted", events.some((e) => e.type === "result"));
} else {
  check("pipeline succeeds", false, String(exit.cause));
}

// --- error path: provider down ---------------------------------------------
globalThis.fetch = async () => new Response("boom", { status: 500 });
calls.length = 0;
const t0 = Date.now();
const exitErr = await Effect.runPromiseExit(
  unbullshitify({
    input: INPUT,
    settings: { ...settings, rounds: 0 },
    emit: () => {},
  }),
);
check("provider error surfaces as failure", Exit.isFailure(exitErr));
console.log(`  (retried for ${Date.now() - t0}ms)`);

console.log(failures === 0 ? "\nPIPELINE TESTS OK" : `\nFAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
