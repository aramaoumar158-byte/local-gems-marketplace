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
