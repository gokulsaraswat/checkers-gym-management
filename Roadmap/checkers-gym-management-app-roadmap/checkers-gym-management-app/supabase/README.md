# Supabase assets

## Database
Run `schema.sql` in the Supabase SQL Editor.

## Edge Function
Deploy `functions/admin-members/index.ts` as a function named `admin-members`.

The React admin page invokes it with:

```js
supabase.functions.invoke('admin-members')
```

Use either:

- Supabase Dashboard > Edge Functions
- Supabase CLI
