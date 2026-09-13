# SukaTani Multi-Page Build

- [x] Create task.md
- [x] app/components/BottomNav.tsx (English navigation)
- [x] app/page.tsx → Landing / Splash (English + Auth state redirect)
- [x] app/login/page.tsx (Supabase Auth signInWithPassword)
- [x] app/signup/page.tsx (Supabase Auth signUp + profiles table insert)
- [x] app/home/page.tsx (English dashboard, user-scoped ledger, listen summary, logout)
- [x] app/verdict/page.tsx (English photo verdict, voice brief, functional action buttons)
- [x] app/confirm/page.tsx (English classify & save to Supabase farmer_ledger, keypad)
- [x] app/receipts/page.tsx (English monthly receipts, user-scoped, expandable transcripts)
- [x] app/harvest/page.tsx (English harvest tracker, Supabase harvest_records persistence)
- [x] app/report/page.tsx (English bank report, user-scoped credit evaluation)
- [x] app/layout.tsx (AuthProvider wrapper)
- [x] src/voice.py (ElevenLabs English natural speech generation)
- [x] docs/supabase_migration.sql (Profiles, RLS, user_id, harvest_records)
- [x] npm run build → verify zero errors
- [ ] git commit & push
