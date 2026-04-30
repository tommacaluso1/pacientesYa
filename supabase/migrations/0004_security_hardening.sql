-- 0004 — security advisor hardening
--
-- Addresses warnings from `mcp__supabase__get_advisors security` that are
-- safe to fix in SQL. Items deferred (see notes at bottom):
--   • vector extension lives in public — moving it would require recreating
--     the embeddings.embedding column type. Higher risk than reward right now.
--   • Auth leaked-password protection is a dashboard toggle, not SQL.

-- ============================================================
-- search_path hardening
-- ============================================================
-- Without an explicit search_path, a user with CREATE on any schema in the
-- caller's path could shadow a function and trick these into running attacker
-- SQL. Pinning to pg_catalog,public removes that path.
alter function public.set_updated_at()
  set search_path = pg_catalog, public;

alter function public.match_embeddings(vector, integer, double precision, uuid)
  set search_path = pg_catalog, public;

-- ============================================================
-- revoke RPC execute on internal SECURITY DEFINER helpers
-- ============================================================
-- Both functions are invoked by triggers (which run as the owner regardless)
-- and have no business being callable through PostgREST as /rest/v1/rpc/*.
-- handle_new_user fires on auth.users insert; rls_auto_enable is an
-- ddl_command_end event trigger.
revoke execute on function public.handle_new_user()  from anon, authenticated, public;
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
