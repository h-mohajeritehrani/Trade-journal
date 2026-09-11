Trade Journal V6.0 – Cloud Sync

New in V6.0:
- Optional Supabase cloud sync between phone and laptop
- Keeps local-first/offline behavior
- Email/password sign-in
- Auto-sync after local changes and when reconnecting
- Manual Use Cloud Data / Upload This Device conflict controls
- Existing V5.x localStorage keys are preserved for an easy upgrade

Setup:
1) Create a Supabase project.
2) Run SUPABASE_SETUP.sql once in Supabase SQL Editor.
3) In Supabase Auth settings, keep Email auth enabled.
4) In the journal > Statement > Cloud Sync, enter Project URL and Publishable/anon key. NEVER use Service Role key.
5) Create an account or sign in with the same account on phone and laptop.

Security:
- RLS policies restrict each signed-in user to their own row.
- Publishable/anon browser keys are intended for client apps; Service Role keys are not.
- Your GitHub Pages source can remain public without exposing your journal rows when RLS is configured correctly.
