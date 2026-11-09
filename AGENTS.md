<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Sensitive administrator mutations and their audit records must commit atomically through database RPCs; audit records are append-only and readable only by non-suspended administrators.
- Audit snapshots project only relevant administrative fields, never entire profiles or secret configuration values, to minimize sensitive data retention.
- Manual audit AI review reloads selected event IDs through the caller's RLS client and revalidates non-suspended administrator roles server-side; models receive allowlisted, contact-free snapshots and never execute administrative actions.
- AI review uses request-local Responses streaming helpers under src/lib/ai and a raw HTTP server route; terminal provider denial state is durable and blocks subsequent calls until access is restored.

- Public Lovable Cloud connection values are defined as fallbacks in vite.config.ts because .env is excluded from the saved project, so hosted builds would otherwise ship without them.
