-- Follow-up fix: this project's public schema has ALTER DEFAULT PRIVILEGES
-- granting EXECUTE to anon/authenticated on every new function (confirmed via
-- pg_proc.proacl — notif_comentario etc. retained explicit anon=X/authenticated=X
-- entries even after `revoke ... from public`, because that only strips the
-- implicit PUBLIC pseudo-role entry, not the separate default-privilege grants).
-- handle_new_user's proacl has neither anon nor authenticated nor a bare
-- PUBLIC entry — that's the target shape for pure trigger-implementation
-- functions with no legitimate direct-RPC caller.

revoke execute on function public.notif_comentario() from anon, authenticated;
revoke execute on function public.notif_comentario_del() from anon, authenticated;
revoke execute on function public.notif_obra_aceptada() from anon, authenticated;
revoke execute on function public.notif_nuevo_seguidor() from anon, authenticated;
revoke execute on function public.notif_nuevo_seguidor_del() from anon, authenticated;
revoke execute on function public.notif_solicitud_mensaje() from anon, authenticated;
revoke execute on function public.notif_obra_likeada() from anon, authenticated;
revoke execute on function public.notif_obra_likeada_del() from anon, authenticated;
