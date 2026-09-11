-- Trade Journal V6.0 Cloud Sync
-- Run this once in Supabase > SQL Editor.

create table if not exists public.trade_journal_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  client_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trade_journal_state enable row level security;

revoke all on table public.trade_journal_state from anon, authenticated;
grant select, insert, update, delete on table public.trade_journal_state to authenticated;

drop policy if exists "journal_select_own" on public.trade_journal_state;
drop policy if exists "journal_insert_own" on public.trade_journal_state;
drop policy if exists "journal_update_own" on public.trade_journal_state;
drop policy if exists "journal_delete_own" on public.trade_journal_state;

create policy "journal_select_own"
on public.trade_journal_state for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "journal_insert_own"
on public.trade_journal_state for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "journal_update_own"
on public.trade_journal_state for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "journal_delete_own"
on public.trade_journal_state for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create or replace function public.set_trade_journal_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trade_journal_set_updated_at on public.trade_journal_state;
create trigger trade_journal_set_updated_at
before update on public.trade_journal_state
for each row execute function public.set_trade_journal_updated_at();
