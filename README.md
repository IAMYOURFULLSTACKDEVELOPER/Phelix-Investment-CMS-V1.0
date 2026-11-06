# Phelix Investment CMS

React + TypeScript + Tailwind CSS + Supabase (PostgreSQL, Auth, Storage, Row-Level
Security) implementation of the CMS described in the project proposal, covering:

- **Accounting** — daily/monthly/yearly revenue & expense tracking, "Payments Made" log
- **Operations** — worker directory (Grafton's & Hasting's depots), star ratings, incident log, promotions
- **Fuel Monitoring** — issuance log with mandatory dispenser photo + receipt upload
- **Super Admin dashboard** — cross-sector visibility for Mr Phelix

The **EVAC** sector is a deliberately separate application — see the sibling
`phelix-evac/` project.

## Stack

React · TypeScript · Tailwind CSS · React Router · TanStack Query · Supabase JS ·
Tiptap (rich text, wire in where notes/descriptions need formatting) · Vite

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/01_schema.sql` — this creates every table
   and its Row-Level Security policies in one pass.
3. Create Storage buckets are created automatically by the schema script
   (`fuel-evidence`). Confirm they show as **private** in Storage settings.
4. **IMPORTANT**: Disable email confirmation in Supabase Dashboard (Authentication → Providers → Email → "Disable email confirmation") or run the SQL command in `supabase/12_verification_system.sql` comments.
5. Run `supabase/12_verification_system.sql` to enable the manual account approval workflow.
6. Create one Supabase Auth user per real staff member (Authentication → Add user).
7. For each user, insert a matching row into `profiles` with their `role`
   (`super_admin`, `accountant`, `operations_supervisor`, or `fuel_attendant`)
   — see `supabase/02_seed_example.sql` for the pattern. **Do this for every
   user before they try to sign in**, since the app reads `profiles` to route
   people to the correct sector.

## 2. Configure the app

```bash
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from
# Supabase → Project Settings → API
```

## 3. Run locally

```bash
npm install
npm run dev
```

## User Verification System

The CMS includes a manual account approval workflow:

- New user accounts are created with "pending" status
- The Super Admin must approve accounts via the "Verifications" page before users can sign in
- Rejected accounts are documented with a reason
- This adds an extra security layer to control who gets access to the system

To enable this system, run `supabase/12_verification_system.sql` in the Supabase SQL Editor.

## 4. Deploy

Push to a Git repository and connect it to Vercel or Netlify. Set the same two
environment variables in the hosting dashboard. Every push to `main` triggers
an automatic build, matching the proposal's deployment plan.

## How access control actually works

Nothing in the React code decides who can see what — every sector table has
RLS policies (`supabase/01_schema.sql`) that check the signed-in user's role
directly in Postgres. The front end's role-based navigation and route guards
(`src/App.tsx`, `src/components/layout/Shell.tsx`) exist to give people a
clean experience, not to enforce security — even a user who edited the
JavaScript couldn't query another sector's data, because the database itself
refuses the query.

## What's scaffolded vs. what needs finishing before go-live

This is a working, wired-up application — every form writes to Supabase,
every list reads from it, every table is RLS-protected — but a few things
a production rollout should still add:

- Monthly/yearly report **views** (`accounting_monthly`, `accounting_yearly`)
  exist in the schema; a chart/reporting UI for them isn't built yet.
- Tiptap rich-text is listed as a dependency but not yet wired into the
  "Payments Made" purpose field — swap the plain `<input>` for a Tiptap
  editor when structured notes are needed.
- Password reset / invite flows, and a super-admin "create user" screen
  (currently done via the Supabase dashboard).
- Signed/expiring URLs for viewing uploaded photos (currently uploaded and
  stored correctly, but no viewer UI is built to display them back).
