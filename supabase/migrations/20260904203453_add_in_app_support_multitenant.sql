create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null default 'Suporte AURI',
  status text not null default 'open' check (status in ('open','waiting_ai','answered','human_pending','closed')),
  needs_human boolean not null default false,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  sender_type text not null check (sender_type in ('customer','ai','human','system')),
  sender_user_id uuid references auth.users(id) on delete set null,
  content text not null,
  status text not null default 'delivered' check (status in ('delivered','pending_ai','processing','failed')),
  created_at timestamptz not null default now()
);

create index if not exists support_threads_company_idx on public.support_threads(company_id, updated_at desc);
create index if not exists support_threads_requester_idx on public.support_threads(requester_user_id, updated_at desc);
create index if not exists support_messages_thread_idx on public.support_messages(thread_id, created_at asc);
create index if not exists support_messages_pending_ai_idx on public.support_messages(status, created_at) where status = 'pending_ai';

alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;

create policy support_threads_owner_select on public.support_threads
  for select using (requester_user_id = auth.uid() and user_owns_company(company_id));
create policy support_threads_owner_insert on public.support_threads
  for insert with check (requester_user_id = auth.uid() and user_owns_company(company_id));
create policy support_threads_owner_update on public.support_threads
  for update using (requester_user_id = auth.uid() and user_owns_company(company_id))
  with check (requester_user_id = auth.uid() and user_owns_company(company_id));

create policy support_messages_owner_select on public.support_messages
  for select using (
    exists (
      select 1 from public.support_threads t
      where t.id = support_messages.thread_id
        and t.requester_user_id = auth.uid()
        and user_owns_company(t.company_id)
    )
  );
create policy support_messages_owner_insert on public.support_messages
  for insert with check (
    sender_type = 'customer'
    and sender_user_id = auth.uid()
    and exists (
      select 1 from public.support_threads t
      where t.id = support_messages.thread_id
        and t.company_id = support_messages.company_id
        and t.requester_user_id = auth.uid()
        and user_owns_company(t.company_id)
    )
  );

create or replace function public.touch_support_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_threads
  set last_message_at = new.created_at, updated_at = now()
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_support_thread on public.support_messages;
create trigger trg_touch_support_thread
after insert on public.support_messages
for each row execute function public.touch_support_thread();
