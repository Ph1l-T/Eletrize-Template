# Access Control Setup

This project now supports per-user access by environment.

## How it works

There are 2 layers:

1. Frontend

- hides environments, routes, scenes and devices the user cannot use

2. Backend

- blocks `/hubitat-proxy` commands for device IDs outside the user's access
- filters `/polling` so restricted users only receive allowed device IDs

## Required Supabase file

Run:

- `sql/supabase/migrations/SUPABASE_ACCESS_CONTROL.sql`

This creates:

- `user_access_profiles`
- `user_environment_access`
- `environment_device_registry`

## Access model

If a user has:

- no row in `user_access_profiles`

the app keeps that user unrestricted.

Important:

- users without profile row are unrestricted

Example explicit admin:

```sql
insert into public.user_access_profiles (user_id, role, display_name, is_admin)
values ('USER_UUID_HERE', 'admin', 'Administrador', true)
on conflict (user_id) do update
set
  role = excluded.role,
  display_name = excluded.display_name,
  is_admin = excluded.is_admin;
```

If a user has a row and:

- `is_admin = true` or `role = 'admin'`

the app keeps that user unrestricted.

If a user has a non-admin profile:

- access is limited to the environments listed in `user_environment_access`

## Example guest

Guest with access only to Living and Suite I:

```sql
insert into public.user_access_profiles (user_id, role, display_name, is_admin)
values ('USER_UUID_HERE', 'convidado', 'Convidado', false)
on conflict (user_id) do update
set
  role = excluded.role,
  display_name = excluded.display_name,
  is_admin = excluded.is_admin;

insert into public.user_environment_access (user_id, environment_key, can_view, can_control, can_create_scenes)
values
  ('USER_UUID_HERE', 'ambiente2', true, true, false),
  ('USER_UUID_HERE', 'ambiente7', true, true, false)
on conflict (user_id, environment_key) do update
set
  can_view = excluded.can_view,
  can_control = excluded.can_control,
  can_create_scenes = excluded.can_create_scenes;
```

## Notes

- `can_view`: user can see the environment
- `can_control`: user can send commands to devices in that environment
- `can_create_scenes`: user can use that environment inside the scenes builder
- inside the admin panel, `can_create_scenes` implies `can_control`, and `can_control` implies `can_view`

If you change device IDs in `config.js`, rerun the seed part of `sql/supabase/migrations/SUPABASE_ACCESS_CONTROL.sql` so the backend registry stays in sync.
