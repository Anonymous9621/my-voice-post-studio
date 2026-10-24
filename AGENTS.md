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

# Architecture rules

- All AI calls go through `src/lib/ai/gateway.server.ts` (`generateStructured`); model, vision model and gateway URL come from env vars (`AI_TEXT_MODEL`, `AI_VISION_MODEL`, `AI_GATEWAY_URL`) so the provider is swappable without code changes.
- AI features are exposed only as authenticated server functions in `src/lib/ai.functions.ts`, which return `ActionResult` objects (`{ ok, data } | { ok: false, error, code }`) instead of throwing, so the UI can show friendly errors.
- Prompts and strict output schemas live in `src/lib/ai/prompts.server.ts`; schemas must keep every field required (Responses strict mode).
- Plan limits are defined in code in `src/lib/plans.ts`; a user's plan comes from the `subscriptions` table, which users can only read. Future billing only needs to update that table.
- Usage is metered by appending rows to `usage_events`; limits are checked server-side before each AI call and reset monthly (UTC).
- Browser reads/writes use the Supabase client with row-level security; query definitions live in `src/lib/queries.ts` and pages load them via route loaders + `useSuspenseQuery`.
- Signed-in pages live under `src/routes/_authenticated/`; the `_app` layout adds the sidebar shell and redirects to `/onboarding` until `profiles.onboarding_completed` is true.
- Product photos are stored in the private `product-images` bucket under `<user_id>/...`; the server downloads them and sends them inline to the vision model.
- Never let the AI invent facts: generation uses only the brief and user-confirmed photo notes, and returns clarifying questions for missing details.
