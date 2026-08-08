# Split Striker Wise — Mobile

Expo (React Native) client for Split Striker Wise. Talks to the same FastAPI backend as the web app.

## Prerequisites

- Node.js 20+
- npm
- Backend running (see root `README.md`)
- Android Studio emulator / Xcode iOS Simulator, **or** a development build on a physical phone
- Optional: [EAS CLI](https://docs.expo.dev/eas/) for cloud builds (`npm i -g eas-cli`)

> **Expo Go note (SDK 57):** App Store Expo Go is often behind this project’s SDK.
> Scanning the QR code on a phone with an older Expo Go shows
> “Project is incompatible with this version of Expo Go”.
> Use a **development build** on iPhone (below), or Expo web / simulator.

## Setup

```bash
cd mobile
cp .env.example .env
npm install
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Yes (prod) | API base **including** `/api`. Example: `https://split-striker.onrender.com/api` |
| `EXPO_PUBLIC_APP_ENV` | No | `development` (default), `staging`, or `production` |
| `EAS_PROJECT_ID` | For EAS | Expo project id (set after `eas init`) |

Copy from `.env.example`. `.env` is gitignored.

**URL rules**

- Prefer `http://127.0.0.1:8000/api` over `localhost` (avoids IPv6 mismatches on some Macs).
- Android emulator: the app rewrites `127.0.0.1` / `localhost` → `10.0.2.2`.
- Physical device: use your machine’s LAN IP, e.g. `http://192.168.1.20:8000/api`.
- Production builds **require** an `https://…/api` URL (`EXPO_PUBLIC_APP_ENV=production`).

## Run the backend for devices

Bind on all interfaces so emulators/phones can reach it:

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Development commands

```bash
cd mobile
npm start          # Expo dev server (QR / press a / i)
npm run android    # open Android emulator / Expo Go
npm run ios        # open iOS Simulator / Expo Go
npm run typecheck
npm run lint
npm test
npm run test:auth-api   # live auth smoke test against API_BASE_URL
```

### Android emulator

1. Start an AVD from Android Studio.
2. Keep `EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api` (rewritten to `10.0.2.2` at runtime).
3. Run backend with `--host 0.0.0.0`.
4. `npm run android`.

Cleartext HTTP is allowed when `EXPO_PUBLIC_APP_ENV` is not `production`.

### iOS simulator

1. Install Xcode + Simulator.
2. Use `http://127.0.0.1:8000/api`.
3. `npm run ios`.

Local networking is allowed via `NSAllowsLocalNetworking`.

### Physical iPhone (recommended — development build)

App Store Expo Go does **not** reliably support SDK 57. Install a project-specific
dev client instead:

1. Plug in the iPhone, trust the computer, unlock the phone.
2. Same Wi‑Fi (or hotspot). Set API URL to your Mac LAN IP:
   ```bash
   ipconfig getifaddr en0
   # mobile/.env → EXPO_PUBLIC_API_BASE_URL=http://<THAT_IP>:8000/api
   ```
3. Backend: `uvicorn main:app --reload --host 0.0.0.0 --port 8000`
4. From `mobile/`:
   ```bash
   npm run ios:device
   ```
   First run may open Xcode signing — pick your Apple ID team and allow the
   developer certificate on the phone (**Settings → General → VPN & Device Management**).
5. After install, start Metro with `npm start` and open the **Split Striker Wise**
   app on the phone (not Expo Go).

Cloud alternative (Apple Developer Program + TestFlight): `eas build --profile development --platform ios`
or `eas go` for an SDK-matched Expo Go build.

### Physical Android

```bash
npm run android:device
```

Keep LAN IP in `.env` and backend on `--host 0.0.0.0`.

Deep links use the `splitstriker://` scheme (invite: `/invite/<token>`).

## Production / EAS builds

```bash
npm i -g eas-cli
cd mobile
eas login
eas init                 # sets project id → put in EAS_PROJECT_ID / app config
```

Set secrets / env for the build profile:

```bash
eas env:create --name EXPO_PUBLIC_API_BASE_URL --value https://your-api.example.com/api --environment production
eas env:create --name EXPO_PUBLIC_APP_ENV --value production --environment production
```

Build:

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

Profiles are defined in `eas.json` (`development`, `preview`, `production`).

Local native projects (optional):

```bash
npx expo prebuild
npx expo run:android
npx expo run:ios
```

## Architecture notes

- **Auth**: JWT Bearer from `POST /api/auth/login|signup`, stored in Expo SecureStore (`split_striker_token` / `split_striker_user`).
- **Data**: TanStack Query; expense/group mutations invalidate summary, activity, balances, and group expenses.
- **Splits / balances**: Computed by the backend only. The client validates form input; it does not reimplement `split_calculator`.
- **Themes**: Same six brand themes as web (maroon default).

## Known limitations

- Notes and receipt uploads are not in the create/update expense API — omitted on mobile.
- Invite accept currently sends `user_id` in the body (matches backend); prefer joining while signed in.
- Friend expenses are equal 50/50 via the friend-expense endpoint (no custom split UI).
- No push notifications yet.
- JWT logout is client-side only (token valid until expiry).

## Project layout

```
mobile/
├── app/                 # Expo Router screens
├── src/api/             # Typed API clients
├── src/features/        # Auth, dashboard, expenses, groups
├── src/stores/          # Zustand (auth, theme, token memory)
├── src/components/      # Shared UI
├── app.config.ts
├── eas.json
└── .env.example
```
