/**
 * Alchemy (https://alchemy.run) stack for deploying unbullshitify to
 * Cloudflare Workers (paid plan).
 *
 * The app is fully client-side BYOK: keys live in the visitor's localStorage
 * and requests go straight from their browser to their provider. The Worker
 * only serves the static SPA build (root `pnpm build` → dist/), so it needs no
 * bindings, no secrets, and no script of its own.
 *
 * Deploy:  pnpm deploy   (= pnpm build && alchemy deploy, from repo root)
 * Destroy: pnpm destroy
 *
 * Auth: CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID env vars, or `alchemy
 * login` once. Never run `alchemy dev` against a deployed worker — it replaces
 * the live worker with a local bridge stub until you redeploy.
 */
/* oxlint-disable import/no-default-export -- required by the alchemy CLI */
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";

export default Alchemy.Stack(
  "unbullshitify",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const site = yield* Cloudflare.Worker("Site", {
      assets: {
        // relative to this package: packages/infra → repo-root dist/
        directory: "../../dist",
        notFoundHandling: "single-page-application",
      },
    });

    return {
      url: site.url,
    };
  }),
);
