# Firebase configuration (BioIntel)

**Product law:** Solo + localStorage / IDB / download remains the **default**. Firebase is **optional** cloud infrastructure (hosting, optional Auth, optional sync). Do not require cloud for Discover → board → pack.

## Live backend

| Item | Value |
|------|--------|
| GCP / Firebase project | `kbiointelbrowser04052026` |
| App Hosting backend | `biointel` (Node 22) |
| App URL | https://biointel--kbiointelbrowser04052026.us-east4.hosted.app |
| Region | `us-east4` |

## Enabled products

| Product | Purpose in BioIntel | App wiring |
|---------|---------------------|------------|
| **App Hosting** | Deploy Next.js SSR | `firebase.json` → `apphosting`, `apphosting.yaml` env |
| **Auth** | Optional Google sign-in | `FirebaseProvider`, `UserMenu` |
| **Firestore** | Projects, settings, pack **metadata** | `projectSync`, `settingsSync`, `packMetaSync` |
| **Realtime Database** | Presence only (`presence/{uid}`) | `userProfile` online/offline |
| **Storage** | Optional JSON export archives | `storageSync` → `users/{uid}/exports/…` |
| **Functions** | Thin utilities (`health` probe) | https://us-central1-kbiointelbrowser04052026.cloudfunctions.net/health |

## Local env

Copy from `.env.local.example` into **`.env`** (gitignored):

```text
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Admin SDK (server only, never `NEXT_PUBLIC_`):

```text
GOOGLE_APPLICATION_CREDENTIALS=./kbiointelbrowser04052026-firebase-adminsdk-….json
# or
FIREBASE_ADMIN_CREDENTIALS_JSON={"type":"service_account",...}
```

Admin key JSON is **gitignored** (`*-firebase-adminsdk-*.json`).

## App Hosting environment variables

**Important:** The Firebase **Admin SDK cannot set App Hosting env vars**. App Hosting config is applied via:

1. **`apphosting.yaml`** (repo) — public `NEXT_PUBLIC_FIREBASE_*` as plain `value`s  
2. **Cloud Secret Manager** — sensitive server secrets referenced as `secret:`  
3. **Firebase Console** → App Hosting → Settings → Environment (overrides yaml)

### What we deploy

| Variable | Source | Availability |
|----------|--------|--------------|
| `NEXT_PUBLIC_FIREBASE_*` (7 keys) | `apphosting.yaml` plain values | BUILD + RUNTIME |
| `FIREBASE_ADMIN_CREDENTIALS_JSON` | Secret Manager (from Admin SDK JSON file) | RUNTIME only |
| `FIREBASE_CONFIG` / `FIREBASE_WEBAPP_CONFIG` | Auto-injected by App Hosting | system |

### Deploy / rotate Admin secret

```powershell
# Uses local gitignored *-firebase-adminsdk-*.json
npm run firebase:apphosting:admin-secret

# Or explicit path:
node scripts/deploy-apphosting-admin-secret.js .\your-adminsdk.json
```

This runs `firebase apphosting:secrets:set` + `grantaccess` for backend `biointel`.  
Then push / create a rollout so the new secret version is bound.

## Code map

| File | Role |
|------|------|
| `src/lib/firebase/config.ts` | Read web config from env |
| `src/lib/firebase/client.ts` | Browser Auth / Firestore / RTDB / Storage |
| `src/lib/firebase/admin.ts` | Server Admin SDK (`server-only`) |
| `src/lib/firebase/FirebaseProvider.tsx` | Auth + auto-migrate + `syncNow` |
| `src/lib/firebase/userProfile.ts` | Firestore `users/{uid}` + RTDB presence |
| `src/lib/firebase/paths.ts` | Owner-scoped collection / storage paths |
| `src/lib/firebase/sanitize.ts` | Strip `undefined`; doc size guard |
| `src/lib/firebase/projectSync.ts` | Local projects ↔ Firestore |
| `src/lib/firebase/settingsSync.ts` | Discovery prefs ↔ Firestore |
| `src/lib/firebase/packMetaSync.ts` | Pack **index meta** ↔ Firestore (no claims) |
| `src/lib/firebase/storageSync.ts` | Optional JSON backup to Storage |
| `src/lib/firebase/migrate.ts` | Bidirectional migrate + throttle + report |
| `src/components/layout/UserMenu.tsx` | Sign-in, sync, Storage backup |
| `src/app/projects/page.tsx` | **Sync cloud** / **Cloud backup** when signed in |
| `apphosting.yaml` | App Hosting `NEXT_PUBLIC_FIREBASE_*` |
| `firebase.json` | Product wiring |
| `firestore.rules` / `database.rules.json` / `storage.rules` | Owner-only security |

## Top-bar account menu

- **Signed out:** Sign in with Google (Firebase Auth popup).
- **Signed in:** Photo, name, email, uid; cloud project count; **Sync projects & prefs**; **Backup export to Storage**; Sign out.
- Auto-migrate on login (throttled to once per hour per browser).
- No local mock identity.

## Local ↔ cloud migration

**Default remains local.** Cloud is optional backup when signed in.

| Data | Local store | Cloud path | Merge / notes |
|------|-------------|------------|---------------|
| Project boards | `biointel-project-*` | Firestore `users/{uid}/projects/{id}` | Last-write-wins by `updatedAt` |
| Discovery preferences | discovery prefs key | Firestore `users/{uid}/settings/discovery` | Last-write-wins by `updatedAt` |
| Pack **metadata** | `biointel-pack-index-v1` | Firestore `users/{uid}/packs/{packId}` | Meta only (id, title, counts, hash) |
| Pack claim blobs | download / IDB | **Not uploaded** | Product law |
| Project JSON archive | download file | Storage `users/{uid}/exports/*.json` | Manual backup button |
| Presence | — | RTDB `presence/{uid}` | Online/offline only |

**Behavior**

1. On Google sign-in, `maybeAutoMigrateOnLogin` runs if last migrate was ≥1h ago.
2. Menu / Projects → **Sync** runs pull-then-push for projects + pack meta + prefs.
3. Oversized projects are slimmed or skipped with a warn log.
4. Firestore rejects `undefined`; writes go through `stripUndefined`.
5. Local project delete also best-effort deletes the matching cloud project when signed in.
6. Agent activity: `firebase.migrate.complete`, `firebase.sync.*`, `firebase.storage.*`.

## Deploy commands

```powershell
# Security rules (run after rule edits)
npm run firebase:deploy:rules
# or:
firebase deploy --only firestore:rules,storage,database

# Cloud Functions
npm run firebase:deploy:functions

# App Hosting backends
firebase apphosting:backends:list
firebase apphosting:backends:get biointel

# Rollout (requires GitHub repo connected to the backend in Console)
firebase apphosting:rollouts:create biointel -b main -f
```

If `apphosting:backends:get` shows an empty **Repository** column, connect GitHub in  
[Firebase Console → App Hosting → biointel](https://console.firebase.google.com/project/kbiointelbrowser04052026/apphosting)  
so pushes to `main` build automatically. `apphosting.yaml` already injects Firebase web config at BUILD + RUNTIME.

## Auth setup checklist (Console)

1. Authentication → Sign-in method → **Google** enabled  
2. Authorized domains include:
   - `localhost`
   - `biointel--kbiointelbrowser04052026.us-east4.hosted.app`
   - any custom domain you attach  
3. OAuth support email set (`firebase.json` auth providers)

## Security posture

- Default deny; users only access `users/{theirUid}/**` (Firestore) and `users/{uid}/exports/**` (Storage)  
- RTDB only `presence/{uid}`  
- No public research packs in cloud by default  
- Pack **files** stay download/IDB; Firestore holds optional metadata only  

## What is intentionally not built yet

- Real-time multi-device live collaboration (sync is on login / manual)  
- Full pack claim blob upload to Storage or Firestore  
- Multi-tenant sharing / team workspaces  
- Replacing localStorage with cloud as the only store  
