# LingoNaija
Learn the languages. Live the culture.

Official workspace: C:\Users\JOHN-KUNLE\OneDrive\Desktop\lingonaija. Work only here.

## Current implementation
React/TypeScript/Vite/Tailwind frontend and FastAPI/SQLAlchemy/Alembic modular monolith with PostgreSQL. The redesigned landing page includes a photographic hero, three language cards, everyday situations, learning-path preview, culture, reward previews and Google calls to action. The existing dashboard is preserved with authentication controls. Learning progress and rewards remain illustrative mock data.

Google authentication uses server-side OpenID Connect authorization-code flow with Authlib, state, nonce and PKCE S256. The Google client secret and Google tokens stay on the backend. Verified Google subjects identify returning User records; first-time identities create independent UUID users with normalized email. Unrelated accounts with the same email are not silently linked, and inactive users are rejected.

The auth_sessions table persists SHA-256 hashes of random session tokens, user IDs and expiration times. HttpOnly, SameSite=Lax cookies hold the opaque token; COOKIE_SECURE enables Secure cookies for HTTPS production. Sessions expire after SESSION_DAYS (default seven), and expiry is checked on authenticated requests. Sign-out checks the exact Origin, deletes the database session and clears the cookie. Reauthentication replaces the presented old session. The temporary signed HttpOnly OAuth-state cookie lasts ten minutes. Google token signature, issuer, audience, expiration and nonce validation is delegated to Authlib. No Google access/refresh token is stored in localStorage.

Endpoints: GET /api/auth/google, GET /api/auth/google/callback, GET /api/auth/me, POST /api/auth/logout and POST /api/enrollments. GET /api/health remains process liveness, not database readiness. Vite proxies /api to port 8000. Future enrollments/progress should be owned by (user_id, language/course_id); User.preferred_language is only a profile preference. Authenticated language selection now persists enrollment and preferred language; learning progress remains mock data.

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

Full lessons, AI, speech, audio, pronunciation scoring, persisted learning progress and XP/streak/achievement backend logic remain deferred. No dashboard redesign or new product features were added in this continuation. No commits or pushes.


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

Enrollment validation: 24 backend tests and 9 frontend tests pass; production build passes. Migration applied to the configured Neon database, revision 0003_enrollments. Existing auth/health tests are preserved. Live database/API checks use temporary synthetic test users in a transaction and roll them back; they are not a live Google login test. Lessons and reward/progress backend features remain deferred.

## First interactive lesson

Yorùbá → Unit 1 → **A Warm Welcome** is now interactive. From the signed-in Yorùbá dashboard, choose **Continue the journey**, or open the first **A warm welcome** path node. Four multiple-choice exercises practise polite welcome, morning and afternoon greetings. Each choice receives immediate feedback and an explanation; the final screen summarises the session. Close and reopen to practise again.

Lesson content lives in `frontend/src/lessonContent.ts`, separate from the reusable `Lesson.tsx` interface. Other lesson entries remain previews. Dashboard progress remains mock data; lesson completion is not persisted and awards no XP, streaks or achievements. No database migration or new API is needed for this lesson.

Manual checks: try one incorrect answer and one correct answer, finish all four exercises, return to the journey, then reopen to confirm a fresh session. Check both themes and a narrow viewport. Escape closes the lesson; keyboard focus returns to the opening control.
