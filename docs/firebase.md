# Firebase configuration (BioIntel)

**Product law:** Solo + localStorage / IDB / download remains the **default**. Firebase is **optional** cloud infrastructure (hosting, optional Auth, optional future sync). Do not require cloud for Discover → board → pack.

## Enabled products

| Product | Purpose in BioIntel |
|---------|---------------------|
| **App Hosting** | Deploy Next.js SSR (`backendId: biointel`) |
| **Auth** | Optional Google sign-in (workspace menu) |
| **Firestore** | Optional user-scoped projects/settings metadata |
| **Realtime Database** | Optional presence only (`presence/{uid}`) |
| **Storage** | Optional user exports (`users/{uid}/exports/…`) |
| **Functions** | Thin utilities (`health` probe) |

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

## Code map

| File | Role |
|------|------|
| `src/lib/firebase/config.ts` | Read web config from env |
| `src/lib/firebase/client.ts` | Browser Auth / Firestore / RTDB / Storage |
| `src/lib/firebase/admin.ts` | Server Admin SDK (`server-only`) |
| `src/lib/firebase/FirebaseProvider.tsx` | Auth state + Google popup |
| `src/lib/firebase/paths.ts` | Owner-scoped collection paths |
| `apphosting.yaml` | App Hosting env for deploys |
| `firebase.json` | Product wiring |
| `firestore.rules` / `database.rules.json` / `storage.rules` | Owner-only security |

## Deploy commands

```powershell
# Rules + functions (requires Blaze for some products)
firebase deploy --only firestore:rules,storage,database,functions

# App Hosting: push to connected GitHub branch, or
firebase apphosting:backends:list
```

## Auth setup checklist (Console)

1. Authentication → Sign-in method → **Google** enabled  
2. Authorized domains include `localhost` and your App Hosting domain  
3. OAuth support email set (done in `firebase.json` auth providers)

## Security posture

- Default deny; users only access `users/{theirUid}/**`  
- No public research packs in cloud by default  
- Pack **files** stay download/IDB; Firestore holds optional metadata only  

## What is intentionally not built yet

- Automatic sync of local projects → Firestore  
- Multi-tenant sharing  
- Replacing localStorage with cloud as the only store  
