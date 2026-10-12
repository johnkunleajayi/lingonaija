# LingoNaija

**Learn the languages. Live the culture.**

LingoNaija helps beginners connect with Nigerian people and culture through practical Yorùbá, Igbo and Hausa learning experiences.

It brings everyday situations, guided practice, cultural context and visible progress together in a modern learning journey designed to help people keep learning and use what they learn.

## Learning That Stays With You

LingoNaija was built for the capstone theme **Learning That Stays With You**.

The goal is to move learners beyond recognising isolated words toward understanding and using language in everyday situations.

Short contextual lessons introduce useful expressions, while immediate feedback, visual review, sentence building and conversation practice help learners revisit and apply what they learn.

XP, levels, streaks and visible progress encourage learners to stay in the learning journey.

## What works today

- **Google sign-in:** Individual learner accounts, profile avatars with initials fallback and secure sign-out.

- **Interactive lessons:** Contextual questions, immediate feedback and first-attempt scoring, with optional exercise-specific imagery.

- **Persistent learning journeys:** Learners can enroll in any of the three languages. Lesson completion, original score and completion time are saved independently per user and language. Sequential unlocking continues across units.

- **XP and levels:** Each lesson awards 10 XP on first completion only. Replays cannot farm XP. Global XP drives learner levels while course progress remains language-specific.

- **Daily streaks:** Completing a lesson, including a replay, counts once per Africa/Lagos calendar day. Consecutive days extend the streak; missed days reset the current streak while retaining the longest streak.

- **Conversation Practice:** Each language includes a guided three-turn greeting scenario with its companion — Adé, Ada or Amina — unlocked after completing that language's first lesson. Accepted responses tolerate differences in marks, case, punctuation and spacing while hints and preferred forms support learning.

- **Visual Review:** Learners connect familiar language with images from everyday Nigerian life, turning revision into active visual recall.

- **Build the Sentence:** Learners arrange scrambled word tiles into the correct sentence, moving from recognising language toward constructing it.

- **Responsive experience:** LingoNaija supports desktop and mobile layouts, light and dark themes, cultural companion artwork, language-selection sounds and a shared lesson-completion celebration.

- **Reliable progress saving:** Saving has explicit success and failure states, and automatic dashboard return occurs only after progress has been saved successfully.

## Current curriculum

All three language courses currently begin with **Section 1 — Foundations**.

The published curriculum currently contains **24 lessons and 104 exercises**.

| Language | Published units | Lessons / exercises |
| --- | --- | ---: |
| Yorùbá | Getting Started; Everyday Life; Getting Around; Daily Connections; Section Review | 14 / 64 |
| Igbo | Getting Started; Everyday Life | 5 / 20 |
| Hausa | Getting Started; Everyday Life | 5 / 20 |

All three languages cover welcoming, everyday greetings, introductions, family and food.

The Yorùbá course currently extends further into:

- Numbers and money
- Places
- Asking for directions
- Transport and travel
- Time and daily routines
- Shopping and the market
- Making requests
- Visual Review
- Build the Sentence

Core lessons currently contain four exercises, while the two Yorùbá review lessons contain eight exercises each.

## Exercise system

LingoNaija uses reusable exercise types rather than building separate lesson engines for each language.

### `multiple_choice`

Contextual prompts with selectable text answers and immediate feedback.

### `image_choice`

An image with text choices, currently used by **Visual Review**.

### `sentence_order`

Scrambled word tiles with stable identities that learners arrange, edit and submit, currently used by **Build the Sentence**.

Exercises can also include optional media:

```text
exercise.media: { type, src, alt }
```

This allows contextual imagery to be attached only where it improves the learning experience instead of forcing media into every exercise.

Linguistic references are documented in [CURRICULUM_SOURCES.md](CURRICULUM_SOURCES.md).

External photography provenance and usage information are documented in [ASSETS.md](ASSETS.md).

## Architecture

```text
User
  ↓
Enrollment
  ↓
Language
  ↓
Course
  ↓
Section
  ↓
Unit
  ↓
Lesson
  ↓
Exercise
```

LingoNaija uses a **modular monolith** architecture.

This keeps the application straightforward enough to develop and deploy while providing a curriculum structure that can grow across languages, sections, units, lessons and exercise types without requiring a separate application for every language.

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Vitest
- Testing Library

### Backend

- FastAPI
- Python
- SQLAlchemy
- Alembic
- PostgreSQL
- psycopg
- pytest

### Database

PostgreSQL stores:

- users
- authentication sessions
- language enrollments
- lesson completions
- learning streaks

Learner levels are derived from global XP rather than requiring a separate levels table.

### Curriculum

`backend/app/curriculum.json` defines the shared authored hierarchy and ordering for:

```text
Course → Section → Unit → Lesson
```

Stable identifiers allow the curriculum to expand without breaking existing learner completion records.

Frontend lesson content and backend answer keys work with the same curriculum structure.

This separation allows curriculum content to remain authored and reviewable while learner state is persisted independently in PostgreSQL.

## Authentication and security

LingoNaija uses Google authorization-code/OpenID Connect authentication with:

- state validation
- nonce validation
- PKCE
- trusted-Origin checks
- restricted credentialed CORS
- opaque HttpOnly application cookies
- hashed session tokens in PostgreSQL
- session expiry
- sign-out revocation

Google credentials and tokens remain server-side.

Production cookies use secure settings appropriate for the deployed HTTPS environment, while local development works through the Vite proxy.

## Built with Codex

Codex was used as a development partner throughout the creation of LingoNaija.

The project owner defined the product direction, learning experience, architecture decisions, curriculum direction, cultural requirements and approved visual experience.

Codex supported the iterative engineering workflow by helping implement and refine:

- React and TypeScript frontend functionality
- FastAPI backend functionality
- PostgreSQL persistence
- authentication
- curriculum architecture
- reusable components and data models
- Visual Review
- Build the Sentence
- automated tests
- debugging
- technical documentation

Development was iterative: features were scoped, implemented with Codex, reviewed, manually tested and refined based on the resulting learner experience.

Repository-level instructions for working with Codex are maintained in [AGENTS.md](AGENTS.md).

Codex is development tooling for LingoNaija; it is not presented as an AI tutor inside the learner experience.

## Scalability

LingoNaija currently begins with Yorùbá, Igbo and Hausa, but the architecture is not tied to three languages or a fixed number of lessons.

The hierarchy:

```text
Course → Section → Unit → Lesson → Exercise
```

allows additional languages, sections, units, lessons and reusable exercise types to be introduced without rebuilding the application around each new curriculum.

Learner progress is stored per user and language, while global engagement mechanisms such as XP and levels can span the learner's overall experience.

This provides a foundation for expanding LingoNaija to more Nigerian and African languages while preserving a consistent product experience.

## Live demo

LingoNaija is deployed and available for demonstration:

**Live application:** https://lingonaija-frontend.vercel.app/

The production application uses the deployed React frontend, FastAPI backend, PostgreSQL persistence and Google authentication.

## Local setup

### Prerequisites

- Node.js/npm compatible with the repository package lock
- Python 3.12+
- PostgreSQL database, such as Neon
- Google OAuth web application credentials

Use only the official project checkout:

```powershell
cd C:\Users\JOHN-KUNLE\OneDrive\Desktop\lingonaija
```

### 1. Backend configuration

If `backend/.env` does not already exist, use `backend/.env.example` as the configuration template.

Never overwrite an existing private environment file.

Required configuration includes:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Private PostgreSQL connection URI |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `SESSION_SECRET` | Private random session secret |
| `FRONTEND_URL` | Frontend origin |
| `GOOGLE_REDIRECT_URI` | Google OAuth callback |
| `CORS_ORIGINS` | Allowed frontend origins |
| `COOKIE_SECURE` | Secure-cookie configuration |
| `SESSION_DAYS` | Session lifetime |

For local development:

```text
FRONTEND_URL=http://127.0.0.1:5173
GOOGLE_REDIRECT_URI=http://127.0.0.1:5173/api/auth/google/callback
COOKIE_SECURE=false
```

The local frontend origin should also be included in `CORS_ORIGINS`.

### 2. Google OAuth

Create a Google OAuth client of type **Web application**.

For local development, add this exact redirect URI:

```text
http://127.0.0.1:5173/api/auth/google/callback
```

The application uses:

```text
openid
email
profile
```

Keep the client ID and secret only in the private backend environment configuration.

Never place private credentials in `VITE_*` variables or source-controlled files.

### 3. Start the backend

From the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Reuse the existing virtual environment when one is already configured.

Do not reset an existing learner database.

The current migration head is:

```text
0012_variable_lesson_scores
```

Local API documentation:

```text
http://127.0.0.1:8001/docs
```

Health endpoint:

```text
http://127.0.0.1:8001/api/health
```

### 4. Start the frontend

In another PowerShell terminal:

```powershell
cd C:\Users\JOHN-KUNLE\OneDrive\Desktop\lingonaija\frontend
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open:

```text
http://127.0.0.1:5173
```

The Vite development proxy forwards `/api` requests to:

```text
http://127.0.0.1:8001
```

Use `127.0.0.1` consistently for local OAuth and cookies.

## Deployment configuration

For production, the frontend and backend can be deployed independently.

The frontend is built with:

```powershell
npm run build
```

The production build output is:

```text
frontend/dist
```

`VITE_API_BASE_URL` should point to the HTTPS backend origin when the frontend and backend use separate production origins.

Production backend configuration should include the exact deployed values for:

- `FRONTEND_URL`
- `CORS_ORIGINS`
- `GOOGLE_REDIRECT_URI`
- `COOKIE_SECURE=true`

The same production callback must also be configured in Google Cloud.

Database credentials, Google credentials and session secrets must be supplied through the deployment platform's private environment configuration and must never be committed to the repository.

Database migrations must be applied against the intended production database before relying on new schema changes.

## Tests and validation

### Backend

From `backend`:

```powershell
.\.venv\Scripts\python.exe -m pytest
```

### Frontend

From `frontend`:

```powershell
npm test
npx tsc --noEmit
npm run build
```

Tests cover areas including:

- authentication and security
- enrollment
- curriculum ordering
- lesson completion and scoring
- XP-once behaviour
- language-independent progress
- streaks
- reusable exercise interactions
- conversation practice
- UI states

Backend database tests use isolated test databases and OAuth is mocked.

Automated tests complement, rather than replace, manual testing of the complete learner journey.

## Current scope and future expansion

LingoNaija is an actively expanding learning platform.

The following are **not currently presented as implemented features**:

- Listening Checkpoint
- speech recognition
- pronunciation scoring
- AI-powered learning
- achievements
- leaderboards
- streak freezes
- section-completion XP bonus
- Yorùbá Lesson 15
- additional curriculum sections beyond the currently published material

Cultural and celebration sounds currently used in the interface are experience elements, not listening lessons.

The architecture is designed so these capabilities can be introduced deliberately as the learning experience grows.

---

**LingoNaija**

**Learn the languages. Live the culture.**

*Real conversations. Richer connections.*