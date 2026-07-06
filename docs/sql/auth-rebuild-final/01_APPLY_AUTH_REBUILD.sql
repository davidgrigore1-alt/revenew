-- Auth rebuild apply. Review before running.
-- Additive and repeat-safe. Does not delete or rewrite existing users, profiles,
-- businesses, memberships or platform roles.

begin;

alter table public.profiles
  add column if not exists personal_phone text;

comment on column public.profiles.personal_phone is
  'Optional normalized personal contact phone for the account holder. Not an authorization source.';

alter table public.profiles
  drop constraint if exists profiles_personal_phone_format_check;

alter table public.profiles
  add constraint profiles_personal_phone_format_check
  check (
    personal_phone is null
    or personal_phone ~ '^\+?[1-9][0-9]{7,14}$'
  );

create unique index if not exists profiles_user_id_key
  on public.profiles(user_id)
  where user_id is not null;

commit;
