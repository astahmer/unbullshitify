# unbullshitify

Paste a GPT-generated message → get back the prompt that most likely produced it.

**BYOK (Bring Your Own Key)**: everything runs client-side. Your API key lives in
your browser's localStorage and requests go directly from your browser to your
provider — there is no backend.

## Stack

- [TanStack AI](https://tanstack.com/ai) (`@tanstack/ai` + `@tanstack/ai-openai/compatible`) — streaming chat against any OpenAI-compatible endpoint
- [Effect](https://effect.website) — pipeline orchestration, retries with backoff, fiber-based cancellation (Stop aborts the in-flight HTTP request)
- shadcn-style components + Tailwind v4
- kumo-ui stylesheet (spinner)

## The technique

Prompt inversion is approximate; this app uses **round-trip refinement**
("prompt reflection"):

1. **Invert** — a forensic pass over the message looks for tells (assistant
   boilerplate like "I'd be happy to", emoji bullets, TL;DRs, over-parallel
   lists, tone/length/audience constraints) and drafts a candidate prompt.
2. **Verify** — a fresh assistant turn answers *only* the candidate prompt.
3. **Refine** — the diff between original and regeneration feeds back into a
   sharpened candidate.
4. Steps 2–3 repeat for N rounds. A local word-trigram + structure fidelity
   score tracks convergence without extra API calls.

Reconstruction is inherently approximate: it recovers the *shape* of the prompt,
not the exact wording.

## Dev

```sh
pnpm install
pnpm dev                      # vite dev server
pnpm test                     # headless pipeline tests (mocked SSE provider)
pnpm build && pnpm smoke      # boot the built bundle in jsdom
```

Providers: any OpenAI-compatible endpoint works out of the box (OpenAI,
OpenRouter, Groq, Mistral, local Ollama, or a custom base URL). Browser CORS is
supported by all of the presets.
