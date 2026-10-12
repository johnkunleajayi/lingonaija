# Working on LingoNaija

LingoNaija is a Nigerian language-learning platform built around the capstone theme **Learning That Stays With You**. The product prioritizes practical communication, cultural context and sustained learner engagement, beginning with Yorùbá, Igbo and Hausa.

- Work only in `C:\Users\JOHN-KUNLE\OneDrive\Desktop\lingonaija`, the official workspace. Do not locate, create or use another project copy.# Working on LingoNaija
LingoNaija is a Nigerian language-learning 
- Keep `frontend/` (React/TypeScript/Vite/Tailwind CSS) and `backend/` (FastAPI/SQLAlchemy/Alembic/PostgreSQL) as a modular monolith. Prefer focused modules and shared implementations; no separate engines per language.
- Inspect current code and preserve working behaviour before changing it. Implement only the requested scope. Do not commit, push or deploy without explicit user instruction.
- Keep credentials backend-only and configuration in environment variables. Never expose, overwrite or commit private `.env` values. Templates contain placeholders only; `VITE_*` variables are public.
- Preserve Google OIDC state/nonce/PKCE validation, trusted-Origin checks, credentialed restricted CORS, revocable database sessions and HttpOnly cookies. Production cookies are Secure; local development uses the Vite proxy.
- Curriculum is real authored content, not mock progress. `backend/app/curriculum.json` defines Course → Section → Unit → Lesson ordering for both applications. Keep stable IDs and existing completion records; derive navigation from the hierarchy, never lesson-name conditions or fixed course sizes.
- Frontend lesson content and backend answer keys must agree. Reuse `multiple_choice`, `image_choice` and `sentence_order`; optional media belongs to individual exercises. Sentence tiles need stable IDs, including repeated words.
- Preserve per-user/per-language enrollment and completion, immutable first-completion scores, 10 XP once per lesson, global XP-derived levels and Africa/Lagos daily streaks. Never reset learner data. Add new Alembic migrations when schema changes are necessary; do not edit applied migrations or apply production migrations without authorization.
- Conversation Practice is shared deterministic, keyboard-friendly greeting practice for all three languages. Preserve hints, answer reveal and companion replies; it has no saved results or XP.
- Use credible linguistic sources, document additions in `CURRICULUM_SOURCES.md`, preserve orthography and respectful modern cultural representation. Preserve approved assets and document external asset rights in `ASSETS.md`. Do not invent translations or copy third-party branding/artwork.
- Preserve light/dark themes, mobile layouts, keyboard access, meaningful alt text and reduced-motion handling. Do not change scoring, saving, celebration, automatic return or cultural sounds incidentally.
- Test relevant behaviour, not just implementation details. For application changes run frontend tests, TypeScript and production build; run backend tests for backend/curriculum/persistence work. Use isolated test databases and mocked OAuth; never require live paid services or real learner data in tests. Documentation-only changes need reference/configuration checks rather than full suites.
- Standard checks: `cd frontend; npm test; npx tsc --noEmit; npm run build` and, from `backend`, `.\.venv\Scripts\python.exe -m pytest`. No lint script is currently configured.
