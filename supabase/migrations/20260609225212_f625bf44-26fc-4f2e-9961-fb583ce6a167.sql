
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role)         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_company_id()             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_company(uuid)          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_overdue_subscriptions()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()       FROM PUBLIC, anon, authenticated;
