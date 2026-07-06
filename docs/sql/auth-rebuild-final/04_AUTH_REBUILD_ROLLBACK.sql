-- Conservative rollback notes.
-- This package intentionally avoids destructive rollback that could remove user data.
-- If personal_phone must be disabled after apply, prefer leaving the nullable column
-- unused by application code.

-- Optional metadata-only rollback after confirming no application code writes the column:
-- alter table public.profiles drop constraint if exists profiles_personal_phone_format_check;
-- comment on column public.profiles.personal_phone is null;
