-- Hardening pass for notificaciones_app, mirroring the pre-existing
-- fix_security_definer_search_path / revoke_execute_publicar_revista_mensual
-- precedents. Two advisor findings from get_advisors after the base migration:
--
-- 1) notif_desc_agg had a mutable search_path (missing `set search_path`).
-- 2) The 8 new SECURITY DEFINER trigger functions, and mis_preferencias_notif_app,
--    were still callable via PostgREST RPC by anon/authenticated: `revoke
--    execute ... from anon` alone does NOT block this, because CREATE FUNCTION
--    grants EXECUTE to the PUBLIC pseudo-role by default, and every role is
--    implicitly a member of PUBLIC. Must revoke from `public` explicitly.
--    Trigger functions have no legitimate direct-RPC use case (they reference
--    NEW/OLD, only valid in trigger context) — mirrors handle_new_user /
--    bloquear_cambio_rol, which are NOT exposed via RPC at all.

alter function public.notif_desc_agg(text, int) set search_path = public, pg_temp;

revoke execute on function public.notif_comentario() from public;
revoke execute on function public.notif_comentario_del() from public;
revoke execute on function public.notif_obra_aceptada() from public;
revoke execute on function public.notif_nuevo_seguidor() from public;
revoke execute on function public.notif_nuevo_seguidor_del() from public;
revoke execute on function public.notif_solicitud_mensaje() from public;
revoke execute on function public.notif_obra_likeada() from public;
revoke execute on function public.notif_obra_likeada_del() from public;

-- mis_preferencias_notif_app IS meant to be called directly (the self-scoped
-- prefs-read RPC) — revoke the PUBLIC default grant, then re-grant to
-- authenticated only (anon already excluded).
revoke execute on function public.mis_preferencias_notif_app() from public;
grant execute on function public.mis_preferencias_notif_app() to authenticated;
