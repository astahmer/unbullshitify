# unbullshitify

Paste a GPT-generated message → get back the prompt that most likely produced it.

**BYOK (Bring Your Own Key)**: everything runs client-side. API keys live in
your browser's localStorage — one per provider, so switching presets keeps
each key — and requests go directly from your browser to your provider. There
is no backend.

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

Providers: presets for OpenAI, OpenRouter, Groq, Mistral and local Ollama are
built in (one key stored per provider), plus a custom base URL for anything
else OpenAI-compatible. Browser CORS is supported by all of the presets.

## Deploy (Cloudflare Workers, via Alchemy)

The Worker serves only the static SPA build — no bindings, no secrets, nothing
to leak. Keys never touch the server. The Alchemy stack lives in
`packages/infra` (isolated deps: alchemy needs effect 4 while the app stays on
3.x).

```sh
# once: CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID env vars, or `alchemy login`
pnpm deploy     # = pnpm build && alchemy deploy (from packages/infra)
pnpm destroy    # tear down
```

Stack definition: `alchemy.run.ts` (assets-only Worker, SPA fallback). Note:
never leave `alchemy dev` running against the deployed worker — it replaces the
live worker with a local bridge stub until the next `alchemy deploy`.
