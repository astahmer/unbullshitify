# kumo (vendored)

Forked shadcn-style from https://github.com/cloudflare/kumo
(`packages/kumo/src`, MIT) so we own the component code and don't depend on
the broken npm packaging (exports map points at a missing ESM bundle, and the
bundle embeds a second React — see itwas lesson).

Only the components this app uses were vendored, plus their utils and styles.
Update by re-copying the same paths from upstream.
