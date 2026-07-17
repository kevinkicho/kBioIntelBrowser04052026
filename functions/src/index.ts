/**
 * Cloud Functions for BioIntel (optional).
 * Product loop stays client-local; these are thin utilities for cloud features.
 */

import { setGlobalOptions } from 'firebase-functions'
import { onRequest } from 'firebase-functions/https'
import * as logger from 'firebase-functions/logger'
import { initializeApp } from 'firebase-admin/app'

try {
  initializeApp()
} catch {
  // already initialized
}

setGlobalOptions({ maxInstances: 10, region: 'us-central1' })

/**
 * Health probe for App Hosting / monitoring.
 * GET https://<region>-<project>.cloudfunctions.net/health
 */
export const health = onRequest({ cors: true }, (req, res) => {
  logger.info('health check', { method: req.method })
  res.status(200).json({
    ok: true,
    service: 'biointel-functions',
    ts: new Date().toISOString(),
  })
})
