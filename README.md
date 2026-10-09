# LingoNaija
Learn the languages. Live the culture.

Official workspace: C:\Users\JOHN-KUNLE\OneDrive\Desktop\lingonaija. Work only here.

## Current implementation
React/TypeScript/Vite/Tailwind frontend and FastAPI/SQLAlchemy/Alembic modular monolith with PostgreSQL. The redesigned landing page includes a photographic hero, three language cards, everyday situations, learning-path preview, culture, reward previews and Google calls to action. The existing dashboard is preserved with authentication controls. Yorùbá, Igbo and Hausa each have five real lessons across two units, with four contextual exercises per lesson. Lessons unlock sequentially per language. Completion persists with immutable first-choice score and a one-time 10 XP award; global XP, derived levels and daily streaks remain shared across languages. See [curriculum sources](CURRICULUM_SOURCES.md).

Google authentication uses server-side OpenID Connect authorization-code flow with Authlib, state, nonce and PKCE S256. The Google client secret and Google tokens stay on the backend. Verified Google subjects identify returning User records; first-time identities create independent UUID users with normalized email. Unrelated accounts with the same email are not silently linked, and inactive users are rejected.

The auth_sessions table persists SHA-256 hashes of random session tokens, user IDs and expiration times. HttpOnly, SameSite=Lax cookies hold the opaque token; COOKIE_SECURE enables Secure cookies for HTTPS production. Sessions expire after SESSION_DAYS (default seven), and expiry is checked on authenticated requests. Sign-out checks the exact Origin, deletes the database session and clears the cookie. Reauthentication replaces the presented old session. The temporary signed HttpOnly OAuth-state cookie lasts ten minutes. Google token signature, issuer, audience, expiration and nonce validation is delegated to Authlib. No Google access/refresh token is stored in localStorage.

Endpoints: GET /api/auth/google, GET /api/auth/google/callback, GET /api/auth/me, POST /api/auth/logout POST /api/enrollments and POST /api/learning/{language}/{lesson_id}/complete. GET /api/health remains process liveness, not database readiness. Vite proxies /api to port 8000. Future enrollments/progress should be owned by (user_id, language/course_id); User.preferred_language is only a profile preference. Authenticated language selection now persists enrollment and preferred language; All fifteen lesson completions persist independently per user and language.

## Environment files
Copy examples only when the destination does not already exist:
```powershell
Set-Location 'C:\Users\JOHN-KUNLE\OneDrive\Desktop\lingonaija'
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
```
Root .env: set POSTGRES_PASSWORD for Docker. Backend .env: set DATABASE_URL using the same database password (URL-encode password special characters), plus the Google/session settings below. Real secrets belong only in ignored .env files or deployment secret storage, never examples or source code. No frontend environment variable is required. frontend/.env.example contains only an explanatory comment.

## Google Cloud Console setup
1. Open https://console.cloud.google.com/ and create/select a project.
2. Open Google Auth Platform. If the UI uses the older navigation, use APIs & Services > OAuth consent screen.
3. Configure Branding with app name LingoNaija, a support email and developer contact. Configure Audience as External for public Google accounts; while Testing, add your own Google accounts as test users. Internal is appropriate only for a restricted Workspace organization.
4. Under Data Access, use only OpenID/email/profile scopes: openid, https://www.googleapis.com/auth/userinfo.email and https://www.googleapis.com/auth/userinfo.profile. The code requests the equivalent openid email profile scope string. No separate Drive, Calendar, Google+ API or service account is needed for this sign-in-only flow.
5. Under Clients, create an OAuth client with application type Web application.
6. Add this exact Authorized redirect URI: http://127.0.0.1:5173/api/auth/google/callback
7. Authorized JavaScript origins are not required for this backend redirect flow. If adding a local origin, use http://127.0.0.1:5173 (no path).
8. Put the generated client ID in GOOGLE_CLIENT_ID and the client secret in GOOGLE_CLIENT_SECRET in backend/.env. Do not paste secrets into repository files or chat. If downloading credentials JSON, keep it outside version-controlled source.
9. Generate a strong SESSION_SECRET, at least 32 characters, locally:
```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```
Put its result in backend/.env. Keep these exact local settings:
```dotenv
GOOGLE_CLIENT_ID=your-web-client-id
GOOGLE_CLIENT_SECRET=your-private-client-secret
SESSION_SECRET=your-random-secret-at-least-32-characters
FRONTEND_URL=http://127.0.0.1:5173
GOOGLE_REDIRECT_URI=http://127.0.0.1:5173/api/auth/google/callback
CORS_ORIGINS=["http://127.0.0.1:5173"]
COOKIE_SECURE=false
SESSION_DAYS=7
```
Use 127.0.0.1 consistently. If choosing localhost, replace it consistently in FRONTEND_URL, GOOGLE_REDIRECT_URI, CORS_ORIGINS, browser URL and the Google Console redirect URI: http://localhost:5173/api/auth/google/callback. Port 8000 is the backend, but the registered callback uses frontend port 5173 because Vite proxies /api. Do not register port 8000 for the current configuration.

Restart the backend after editing .env (Ctrl+C, then rerun uvicorn); settings are cached at startup. No frontend credential configuration is needed. Restart Vite if changing its proxy/port configuration. Keep port 5173 using --strictPort.

Production requires a single HTTPS frontend/API origin, COOKIE_SECURE=true, a persistent strong SESSION_SECRET, appropriate HTTPS FRONTEND_URL/GOOGLE_REDIRECT_URI, restricted CORS_ORIGINS and a matching production Google redirect registration. Do not use development HTTP cookie settings in production.

Google references: https://developers.google.com/identity/openid-connect/openid-connect and https://developers.google.com/identity/protocols/oauth2/web-server

## PostgreSQL and run commands
Requires Docker Desktop/Compose or an existing PostgreSQL 16+ database. From the project root, after setting root/backend .env:
```powershell
docker compose up -d db
```
Alternatively create the lingonaija database and a dedicated owning login role, then configure DATABASE_URL. Compose binds port 5432 to localhost and uses a persistent volume. Changing POSTGRES_PASSWORD does not change a password in an existing volume.

Backend terminal:
```powershell
Set-Location 'C:\Users\JOHN-KUNLE\OneDrive\Desktop\lingonaija\backend'
# Create the environment only if missing:
if (!(Test-Path .venv)) { python -m venv .venv }
.\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Frontend terminal:
```powershell
Set-Location 'C:\Users\JOHN-KUNLE\OneDrive\Desktop\lingonaija\frontend'
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```
Use Node 22.12+ or a supported newer version. Backend lockfile was captured from Python 3.14 on Windows; use a compatible Python runtime.

Open http://127.0.0.1:5173. Health: http://127.0.0.1:8000/api/health. API docs: http://127.0.0.1:8000/docs. Stop an old server in its own terminal if its port is occupied; do not terminate unrelated processes.

## Manual Google login test after configuration
1. Start PostgreSQL, apply both migrations and start backend/frontend.
2. Open http://127.0.0.1:5173 and select Continue with Google.
3. Sign in using an allowed test Google account; complete the Google consent flow.
4. Confirm return to the dashboard, the learner name, and GET /api/auth/me returning the same user ID across refreshes.
5. Close/reopen the page to check the cookie session persists. Sign out and verify /api/auth/me returns 401.
6. Sign in again with the same Google identity and confirm no duplicate User is created. Test another account to confirm independent IDs.
7. Cancel Google consent once and confirm an error, not successful authentication. In developer tools verify HttpOnly and SameSite=Lax; Secure is deliberately false for local HTTP and must be true in production HTTPS.
Sign-out revokes LingoNaija's session, not the browser's Google account session.

## Validation commands
```powershell
# frontend/
npm test
npm run build
npm audit
# backend/
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m alembic upgrade head --sql
```
No lint script is configured. TypeScript checking runs in the production build. Backend unit tests use isolated SQLite; callback success is mocked and is not evidence of live Google authentication or PostgreSQL connectivity. See VALIDATION.md for this continuation's actual results.

## Assets and deferred scope
ASSETS.md documents local optimized Ninthgrid/Pexels Lagos friendship photography and Ben Iwara/Unsplash Lagos portrait photography. Original SVG language companions are preserved. Images are illustrative, not endorsements or assertions of a subject's ethnic identity. Native-speaker/cultural review remains appropriate before educational release.

Additional lessons, AI, speech, audio, pronunciation scoring, streaks, achievements and further reward logic remain deferred. No dashboard redesign or new product features were added in this continuation. No commits or pushes.


## Persistent language enrollment
Authenticated users can enroll in yoruba, igbo or hausa using the existing header selector or landing-page language cards. A successful selection creates/reuses enrollment and saves the active language in User.preferred_language; refresh/sign-in restores it. Entering My learning also creates/reuses the selected enrollment. Anonymous choices remain previews and create no database rows. No enrollment backfill is performed for historical preferences.

POST /api/enrollments accepts only {"language":"igbo"} (or yoruba/hausa) and returns {"language":"igbo"}. It derives the owner from the authenticated cookie, rejects user-ID overrides and requires Origin to match FRONTEND_URL. GET /api/auth/me includes enrollments as a list of language keys plus preferred_language. No additional listing endpoint is needed.

Migration 0003_enrollments creates enrollments(user_id, language, created_at), with a composite primary key preventing duplicates (including concurrent requests), a supported-language check and a cascading User foreign key. Enrollment and active-language selection are saved in one transaction. Frontend controls wait for the save; failures keep the previous course and show an error.

Manual test:
1. Run backend migration: .\.venv\Scripts\python.exe -m alembic upgrade head from backend/, then restart the backend. Start the frontend normally.
2. Sign in with Google at http://127.0.0.1:5173. Choose Igbo in the header or on its card.
3. Open http://127.0.0.1:5173/api/auth/me in the same browser; enrollments should contain igbo and preferred_language should be igbo. Refresh the application: Igbo remains selected.
4. Switch to Hausa, then back to Igbo repeatedly. /api/auth/me should contain each selected language only once. Choose Yoruba to add it independently.
5. Sign out and use another Google account. Its enrollments remain independent. Sign back in with the first account: its enrollments and active language remain.
6. In Neon SQL Editor, SELECT user_id, language, created_at FROM enrollments ORDER BY user_id, language; shows one row per user/language. Never paste cookies or credentials into chat or tracked files.

Enrollment validation: 24 backend tests and 9 frontend tests pass; production build passes. Migration applied to the configured Neon database, revision 0003_enrollments. Existing auth/health tests are preserved. Live database/API checks use temporary synthetic test users in a transaction and roll them back; they are not a live Google login test. Additional lesson and reward/progress features remain deferred beyond A Warm Welcome and its one-time 10 XP award.

## First interactive lesson

Yorùbá → Unit 1 → **A Warm Welcome** is now interactive. From the signed-in Yorùbá dashboard, choose **Continue the journey**, or open the first **A warm welcome** path node. Four multiple-choice exercises practise polite welcome, morning and afternoon greetings. Each choice receives immediate feedback and an explanation; the final screen summarises the session. Close and reopen to practise again.

Lesson content lives in `frontend/src/lessonContent.ts`, separate from the reusable `Lesson.tsx` interface. Other lesson entries remain previews. Yorùbá completion and total XP now come from PostgreSQL. First completion awards 10 XP once; replays preserve the original first-choice score and timestamp. Other courses remain previews. No streaks or achievements are implemented. Migration 0004_lesson_completions and the completion API now persist this lesson’s result.

Manual checks: try one incorrect answer and one correct answer, finish all four exercises, return to the journey, then reopen to confirm a fresh session. Check both themes and a narrow viewport. Escape closes the lesson; keyboard focus returns to the opening control.

### Persistent first completion
Run `alembic upgrade head` in the backend environment before restarting. `POST /api/learning/{language}/{lesson_id}/complete` accepts exactly four first-choice option indexes; the server calculates the score. An authenticated session, trusted Origin and Yorùbá enrollment are required. `/api/auth/me` includes completion records and total XP. A unique user/language/lesson key makes replay and retry idempotent; XP is stored on that single record and summed, with no separate mutable balance. Presence of the record means completed status.

Manual check: complete A Warm Welcome, confirm 10 XP and the completed path node, refresh or sign out/in, then replay. XP remains 10 and the saved original score/timestamp remain unchanged. Another account starts with no completion or XP. Failed saves offer Retry saving.

Completion validation: 32 backend tests passed; 15 frontend tests passed with `npm test -- --testTimeout=15000` (the initial parallel run hit two five-second test timeouts); TypeScript/production build passed. Neon is at revision 0004_lesson_completions. A real Neon API check verified first completion, replay and restored progress with temporary data rolled back.

## Yorùbá Unit 1: Everyday Greetings

Lesson 2 uses the same lesson component, completion endpoint and completion table as A Warm Welcome. Its four original situation-based exercises practise morning, afternoon, late-evening greetings and a bedtime farewell. Greeting usage was checked against the University of Texas COERLL Yorùbá Yé Mi chapter on greetings: https://coerll.utexas.edu/yemi/pdfs/yy_ch1.pdf. Exercise scenarios and explanations are original LingoNaija content.

Apply migration `0005_everyday_greetings` with `alembic upgrade head` before restarting the backend. It expands the existing lesson constraint without changing saved Lesson 1 records. The endpoint is now `/api/learning/yoruba/{lesson_id}/complete`; supported IDs are `a-warm-welcome` and `everyday-greetings`. Each accepts four first-choice option indexes. Lesson 2 requires the authenticated learner's own Lesson 1 completion, enforced by the API and dashboard. Each awards 10 XP once; replays preserve the original score and timestamp. Dashboard progress is 0/2, 1/2 or 2/2 and total XP is 0, 10 or 20. All later lessons remain locked previews.

Manual check: sign in and enroll in Yorùbá. Before Lesson 1 completion, Everyday Greetings is locked. Complete A Warm Welcome, then use Continue the journey or the Everyday greetings path node. Complete Lesson 2 and confirm 2/2, 100% and 20 XP. Refresh or sign out/in to confirm restoration; replay either lesson and verify XP remains 20. Accounts remain independent.

## First Igbo lesson: A Warm Welcome

Igbo Unit 1 now has four original practical exercises: welcoming a guest (Nnọọ), greeting a neighbour (Ndewo), checking in (Kedu?) and replying positively (Ọ dị mma). Usage was checked against Harvard ELIAS, Greetings and Responses (https://elias.fas.harvard.edu/languages/igbo/beginning/3/greetings-and-responses), and NKENNE, Basic Igbo Greetings and Introductions (https://www.nkenne.com/blog/basic-igbo-greetings-and-introductions). These sources support phrase meanings; exercise scenarios and explanations are original, not copied lesson material. Igbo greetings vary by community; the lesson makes no universal claims about time-of-day conventions or gestures.

The shared endpoint is now POST `/api/learning/{language}/{lesson_id}/complete`. Igbo's ID is `a-warm-welcome`; the Yorùbá URLs remain valid. Migration `0006_igbo_welcome` extends the existing completion constraint. There is no new engine or table. First-choice score, timestamp and the one-time 10 XP award remain keyed by user/language/lesson. Igbo requires Igbo enrollment, with no Yorùbá prerequisite. `/api/auth/me` keeps aggregate total_xp for compatibility; dashboard XP and progress are calculated from only the selected language's completion records. Hausa remains a preview; all further Igbo lessons remain locked.

Manual check: restart the backend/frontend, sign in, choose Igbo and open My learning. Before completing this lesson, Igbo shows 0/1 and 0 XP even if Yorùbá is complete. Finish A Warm Welcome and confirm 1/1, 100% and 10 XP. Refresh/sign in again and replay: the original score/timestamp and 10 XP remain unchanged. Switch to Yorùbá to confirm its own progress and XP are unchanged. Another account begins independently. Apply migrations using `alembic upgrade head` in the backend environment if running another database.

## First Hausa lesson: A Warm Welcome

Four original situations practise welcoming a visitor (Sannu da zuwa), a simple hello (Sannu), a morning inquiry about sleep (Ina kwana?) and a positive reply (Lafiya lau). Meanings and usage were verified against the University of Wisconsin-Madison's Hausa Greetings resource (https://wisc.pb.unizin.org/lctlresources/chapter/hausa-greetings/) and Omniglot's Useful phrases in Hausa (https://www.omniglot.com/language/phrases/hausa.php). Wisconsin corroborates the hello and morning exchange; Omniglot also lists Sannu da zuwa as welcome. Sources are references for short language facts, not copied exercises, layouts or artwork. Scenarios and explanations are original. The lesson introduces common beginner greetings without claiming that every community or social setting uses identical forms.

The existing shared component and endpoint POST `/api/learning/hausa/a-warm-welcome/complete` handle Hausa. Migration `0007_hausa_welcome` only extends the existing completion check constraint. No new engine or table. Hausa enrollment is required; there is no Igbo or Yorùbá prerequisite. Completion, first-choice score, timestamp and a one-time 10 XP award use the existing user/language/lesson key. Replays preserve the original record. All three dashboards show their own course progress and XP; `/api/auth/me` also retains aggregate total_xp for compatibility. All later Hausa lessons remain locked.

Manual test: restart the app, sign in, select Hausa and enter My learning. Open A Warm Welcome, finish four exercises and confirm 1/1, 100% and 10 XP. Refresh/sign in again and replay: XP and the original saved score/timestamp stay unchanged. Switch between Hausa, Igbo and Yorùbá to confirm separate progress; another account starts independently. Run `alembic upgrade head` in the backend environment if using another database.

## Daily learning streak

A streak is per authenticated learner, across all languages. Calendar days use Africa/Lagos (UTC+1), not the browser clock. Successfully submitting any completed lesson, including a replay, counts as that day's activity. Same-day submissions never add another day. Consecutive days add one; a missed calendar day resets the effective current streak to zero, while the longest streak remains. Yesterday's streak remains active during today until today's opportunity has passed.

`learning_streaks` stores one row per user with current_streak, longest_streak and last_active_date. User-row locking serializes simultaneous completion requests; lesson completion and activity commit together. Expired current streak is computed on reads, so no scheduler is required. The next completion persists the reset count of one. `/api/auth/me` and completion responses include current_streak and longest_streak inside progress. Existing completion timestamps/XP remain unchanged on replay. Migration 0008_learning_streaks backfills only known first-completion dates in Lagos time; past replay dates were not recorded and cannot be reconstructed.

Manual check: restart the application, sign in and complete a lesson. The dashboard shows a 1 day streak (or retains/extends existing history). Complete another lesson or replay on the same day: no increase and no duplicate XP. Return the next calendar day to extend it; skip a full day to see zero current streak, then complete to restart at one. All language dashboards show the same learner-wide streak. Automated tests simulate dates without changing the system clock. No freezes, reminders or achievements are implemented.

## Global learner levels

The authenticated dashboard derives a level from the existing API's global `progress.total_xp`, alongside course-specific completion and course XP. No new database field, table or migration. Threshold for Level L is `10 * L * (L - 1)`: Level 1 at 0 XP, Level 2 at 20, Level 3 at 60, Level 4 at 120, Level 5 at 200. Each next level costs 20 more XP than the previous step. The dashboard shows the current level, global total, progress within the level and XP remaining to the next threshold. Existing completion awards and streak behavior are unchanged.

Manual check: with 0 XP see Level 1, 0 total XP and 20 XP remaining. Complete one new lesson to see 10 XP toward Level 2; complete another new lesson in any language to reach Level 2 at 20 XP. Switch languages or refresh: global level/XP remain the same while course progress changes. Replays award no new XP and cannot advance the level. All four existing lessons yield 40 total XP, still Level 2 with 20 XP remaining to Level 3; higher levels are covered by threshold tests, not new lesson content.

## Yorùbá conversation practice MVP

After your Yorùbá A Warm Welcome completion, open Practise with Adé. The existing three-turn weekend visit uses deterministic local evaluation: welcome, morning, then afternoon. No paid API, API key, model configuration, new dependency or migration. Restart the backend after this update. Existing private .env entries for the removed provider are ignored; the private file was not edited.

Accepted base responses (marks optional):
- Welcome: `e kaabo`, `e kabo`, `kaabo`, `kabo`.
- Morning: `e kaaaro`, `e kaaro`, `e karo`, `kaaaro`, `kaaro`, `karo`.
- Afternoon: `e kaasan`, `e kasan`, `kaasan`, `kasan`.

Normalization uses Unicode decomposition, removes diacritics, ignores capitalization, whitespace and Unicode punctuation. An optional final address to Adé is allowed. Canonically marked input and decomposed Unicode input work equally. This is a deliberately bounded accepted-response evaluator, not unrestricted semantic understanding or fuzzy matching. Wrong-context greetings and unlisted prose fail and offer retry. Correct responses and repeated wrong attempts show the preferred marked form and a gentle reminder to notice marks; a first wrong attempt only hints.

Existing GET `/api/conversation/yoruba` and POST `/api/conversation/yoruba/evaluate` preserve authentication, the learner's own completion gate, Origin validation and input bounds. Response fields remain meaning_correct, preferred_form, orthography_note, feedback, next_turn and complete. Practice stores no responses/results and adds no XP or streak activity. No provider calls are made. All evaluation is local in FastAPI.

Manual test: type `E kaabo!`, `E kaaro`, and `E kaasan` for the respective turns; marked forms should also pass. Try an afternoon greeting on the welcome turn to see retry, then correct it. Extra spacing and capitalization must not change a correct result. Refresh/close resets practice; learning progress, XP and streak remain unchanged.

### Conversation feedback UX

The first wrong attempt on each turn shows a contextual hint without displaying the answer. A second wrong attempt reveals the preferred marked form once. Correct responses show that form once, a gentle orthography reminder and a visible reply from Adé; the learner then chooses Next turn. Adé's final reply appears before Finish conversation opens the completion summary. Retry returns keyboard focus to the input. Attempt counts live only in component state and reset for each new turn or reopened practice. Deterministic evaluation, API fields, saved progress and rewards are unchanged. Preferred-form metadata remains in the response but is not displayed on the first wrong attempt.

Manual check: give two wrong-context greetings on the arrival turn. The first should hint; the second should reveal the marked answer once. Type E kaabo and read Adé's reply before continuing. On the next turn, the first wrong answer should again only hint. Finish all three turns and read Adé's last reply before the summary.

## Shared conversation practice: Igbo and Hausa

All three languages use one Conversation component, one deterministic evaluator and GET `/api/conversation/{language}` / POST `/api/conversation/{language}/evaluate`. Each practice requires that learner's own A Warm Welcome completion in the selected language. Existing Yorùbá URLs remain valid. Language switching remounts practice so draft responses, attempts and character replies never carry into another course. No database migration, rewards, saved results or external service.

Igbo: a visit with Ada. Three turns welcome her (`Nnọọ`, accepted unmarked nnoo/nno), ask how she is (`Kedu?`, also Kedu ka ị mere?), then reply positively (`Ọ dị mma`). Ada replies with original English dialogue; her check-in reply also uses the already-taught Ọ dị mma. Phrase usage verified against Harvard ELIAS Greetings and Responses (https://elias.fas.harvard.edu/languages/igbo/beginning/3/greetings-and-responses) and NKENNE Basic Igbo Greetings and Introductions (https://www.nkenne.com/blog/basic-igbo-greetings-and-introductions). Harvard corroborates the welcome/check-in/reply and longer check-in variant; NKENNE corroborates welcome and positive reply. Scenarios, hints and English replies are original.

Hausa: a morning visit with Amina. Three turns welcome her (`Sannu da zuwa`), ask how she slept (`Ina kwana?`, also Yaya kwana), then reply positively (`Lafiya lau`, also Lafiya). Amina's morning reply uses the already-taught Lafiya lau and Ina kwana. Verified against University of Wisconsin-Madison Hausa Greetings (https://wisc.pb.unizin.org/lctlresources/chapter/hausa-greetings/) for the morning exchange, positive replies and ina/yaya variation; Omniglot Useful phrases in Hausa (https://www.omniglot.com/language/phrases/hausa.php) for the welcome and morning greeting. No source exercise text or artwork is copied.

All three retain Unicode/mark, case, punctuation and spacing normalization, with an optional final direct address to the current companion. Accepted forms remain explicit and context-specific, not unrestricted semantic matching. First wrong attempts only hint; repeated wrong attempts show the preferred form once. Correct responses display the character's reply before Next turn, and a final reply before Finish conversation. Attempt counts reset per turn/reopened practice. Orthography advice suits the selected language.

Manual test: complete Igbo A Warm Welcome, open Practise with Ada and try Nnoo, Kedu?, O di mma. For Hausa after its own lesson, use Sannu da zuwa, Ina kwana?, Lafiya lau. Test a wrong-context greeting twice to check hint/reveal, then correct it to see the character reply. Switch languages and verify only that course's completed welcome unlocks practice. XP, streaks and course progress stay unchanged.

## Five-lesson curriculum database update

Apply migration `0009_five_lesson_curriculum` before completing newly added lessons. It expands the existing completion check constraint; it adds no table and preserves saved scores, timestamps and XP. Downgrade refuses to discard expanded-curriculum completions.

```powershell
Set-Location 'C:\Users\JOHN-KUNLE\OneDrive\Desktop\lingonaija\backend'
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Keep the existing private `backend/.env` and database URL unchanged. To check the journey, sign in, choose a language, complete Getting Started in order, then complete Family & People and Food & Drink in Everyday Life. Each first completion adds 10 XP; replays add none. Switch language to confirm its separate path and the shared total XP. Each finished course contributes 50 XP.
