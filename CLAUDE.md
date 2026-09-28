# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start dev server via nodemon (`ts-node src/server.ts`, watches `src/**/*.{ts,js,json}`).
- `npm run build` — compile TypeScript to `dist/` (`tsc`).
- `npm start` — run the compiled server (`node dist/server.js`). Requires `npm run build` first.
- No test runner is configured (`npm test` is a stub); the `tests/` directory is empty.

Environment selection is controlled by the `ENV` var (defaults to `development`). `src/app.ts` loads `.env.${ENV}` — so `.env.development` and `.env.production` are the config sources. Switching between them is `ENV=production npm start` (or set via process manager).

Key env vars expected: `PORT` (default 3001), `DB_URI` (MongoDB), `JWT_SECRET`, `JWT_EXPIRY`, `JWT_REFRESH_EXPIRY`, plus SendGrid / Cloudinary / Twilio / Firebase credentials used by services.

## Architecture

Express 5 + TypeScript + Mongoose backend for the W-Invest app (users, wallets, ROI investments, team/referrals, games, banners, support tickets, admin, push notifications). All routes are mounted under `/api/v1/*` in `src/app.ts`. Swagger UI is served at `/api/v1/docs`.

### Request flow

`src/server.ts` → `src/app.ts` (env load → DB connect → seed configs → middleware → routes → 404 → global error handler) → `src/routes/*Routes.ts` → `src/controllers/*Controller.ts` → `src/services/*Service.ts` → `src/models/*Model.ts` (Mongoose).

The global error handler in `app.ts` is the single response path for errors — controllers/services should throw errors with `.statusCode` and `.message`, and let the handler format the `{ message, data, stack? }` response. `uncaughtException` / `unhandledRejection` are logged but do not crash the process.

### Layered conventions

- **Routes** (`src/routes/`) wire HTTP verbs to controller functions and apply middleware (`authenticate`, `authorize`, `requireAdmin`, `authorizeOwnerOrAdmin` from `src/middleware/authentication.ts`; `cronAuth` for the cron endpoints). Aggregated in `src/routes/index.ts`.
- **Controllers** (`src/controllers/`) are thin — parse `req`, call a service, respond, and delegate errors via `next(err)`. Everything is function-based (no classes); see `src/middleware/Authentication.md` for the auth pattern.
- **Services** (`src/services/`) hold business logic, cross-model orchestration, and integrations (SendGrid `EmailService`, Firebase `FirebaseService`, `BlockchainService`, `NotificationService`, Socket.IO-backed `SupportTicketService`).
- **Models** (`src/models/`) are Mongoose schemas. `GameConfigModel.seedDefaultGameConfigs()` and `SystemConfigModel.seedDefaultSystemConfig()` run on startup from `app.ts` — new config-style models that need defaults should follow this pattern rather than doing it lazily.

### Cross-cutting pieces

- **Auth**: JWT dual-mode (HTTP-only cookies + `Authorization: Bearer`). Helpers in `src/utils/authHelpers.ts`. See `src/middleware/Authentication.md` for the full catalog of middleware/helpers and how to compose them.
- **Realtime**: Socket.IO server is attached in `src/ws.js` (not TypeScript) on path `/api/v1/support-tickets/socket.io`, including a Postman-style namespace alias. Used only by the support-ticket feature — `getSupportIO()` is how other modules can emit.
- **Rate limiting**: `apiLimiter` from `src/utils/rateLimiter.ts` is applied globally to `/api/`. See `RATE_LIMITER_USAGE.md` for per-route limiter usage.
- **Cron jobs**: `src/routes/CronRoutes.ts` exposes HTTP-triggered cron endpoints protected by `src/middleware/cronAuth.ts` — these are intended to be hit by an external scheduler (node-cron is also a dependency for in-process jobs).
- **Uploads**: `multer` + `multer-storage-cloudinary` — Cloudinary is the image backing store.
- **Swagger**: spec built in `src/config/swagger.ts` via `swagger-jsdoc` from JSDoc in route/controller files.

### Things to know before changing behavior

- `app.ts` currently hardcodes a MongoDB connection string as a fallback if `config.databases[ENV]` is empty. Don't rely on that fallback — set `DB_URI` in the relevant `.env.${ENV}` file.
- CORS is `origin: '*'` with `credentials: true`. This is permissive by design for Swagger/dev; tightening it is a deliberate change, not a cleanup.
- JSON/urlencoded body limits are 25 MB (to accommodate base64 image payloads). Lowering this can break upload endpoints.
- Auth module docs (`src/middleware/Authentication.md`) are the source of truth for auth usage patterns. Several feature-specific markdown files at repo root (`PUSH_NOTIFICATION_GUIDE.md`, `PASSWORD_RESET_DOCUMENTATION.md`, `EMAIL_SETUP_GUIDE.md`, `NOTIFICATION_API_CURL_COMMANDS.md`, `CORRECT_GAME_LOGIC.md`, `GAME_WIN_AMOUNT_EXPLANATION.md`) document subsystem behavior — consult them before changing those flows.
