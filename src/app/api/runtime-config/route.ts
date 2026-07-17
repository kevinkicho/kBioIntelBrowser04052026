import { NextResponse } from 'next/server'
import { isFirebaseConfigured } from '@/lib/firebase/config'
import { isFirebaseAdminConfigured } from '@/lib/firebase/admin'
import { hasOllamaCloudFallback } from '@/lib/ai/cloudConfig'

/**
 * Safe diagnostics for App Hosting env wiring (booleans only — never secret values).
 * GET /api/runtime-config
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    firebaseClient: isFirebaseConfigured(),
    firebaseAdmin: isFirebaseAdminConfigured(),
    ollamaCloud: hasOllamaCloudFallback(),
    ncbiEmailSet: Boolean(process.env.NCBI_EMAIL),
    nodeEnv: process.env.NODE_ENV ?? null,
    // Auto-injected by App Hosting when backend is linked to a Firebase web app
    hasFirebaseConfig: Boolean(process.env.FIREBASE_CONFIG),
  })
}
