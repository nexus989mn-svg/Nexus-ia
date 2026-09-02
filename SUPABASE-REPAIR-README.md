# Supabase repair notes

The project previously had a circular Trial flow: WhatsApp connection required an active subscription, while Trial activation required a connected WhatsApp number. This release breaks that cycle safely:

1. New authenticated customer without a subscription may start WhatsApp setup.
2. WhatsApp connection is used to validate the phone.
3. Trial is then claimed atomically through `claim_trial()`.
4. Customers with an existing Trial/payment continue to use the normal access gate.
5. The admin account is authorized by `user_roles`; no customer subscription is required.

The production database also showed zero rows in `subscriptions`, which is valid under the current no-auto-trial policy, but the old UI interpreted that state as `Desconhecido`/blocked. The UI now shows `Sem assinatura` and still permits WhatsApp setup so the Trial can be activated.

`supabase/migrations/20260901000000_integrity_repair.sql` is idempotent and repairs missing roles/companies/integration records without fabricating customer subscriptions.
