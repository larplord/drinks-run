# Drinks Run

Party drink pre-orders with a private organizer dashboard.

## Vercel setup

1. Import the project root into Vercel. Do not choose the `app` folder by itself.
2. Add a Postgres storage integration from the Vercel Marketplace, such as Neon or Supabase.
3. Add these environment variables to the Vercel project:
   - `DATABASE_URL`: the Postgres connection string from the integration.
   - `ADMIN_PASSWORD`: a long private password for `/admin`.
4. Deploy. The app creates its two tables and indexes on the first database request.

The public order page is `/`. The private organizer dashboard is `/admin`.

## Local development

```bash
npm install
npm run dev
npm run build
```

The order API needs `DATABASE_URL` and the admin dashboard needs
`ADMIN_PASSWORD`. Keep both values in local environment files and Vercel
environment settings, never in source control.
