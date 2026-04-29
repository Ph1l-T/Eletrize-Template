# Supabase SQL Organization

This folder centralizes Supabase SQL scripts used by the dashboard template.

## Structure

- `migrations/`: core schema and policy scripts
- `scripts/`: one-off operational scripts for the new client

## Files

### migrations

- `SUPABASE_ACCESS_CONTROL.sql`: creates access control tables and policies. The device registry seed is empty on purpose.
- `SUPABASE_SCENES.sql`: creates scenes table and related policies/indexes.

### scripts

Add client-specific operational scripts here only after the new client's Supabase project and user list are defined.

## Usage

Run migration scripts first. Then add only the new client's user, environment, and device registry scripts.
