/**
 * Utility functions for API key management, loading, and validation.
 */

import { z } from "zod"

// Define schemas for API keys
const apiKeySchemas = {
  NCI_CADSR_API_KEY: z.string().optional(),
  NCATS_TRANSLATOR_API_KEY: z.string().optional(), 
  NHGRI_ANVIL_API_KEY: z.string().optional(),
  NIAID_IMMPORT_API_KEY: z.string().optional(),
  NINDS_NEUROMMSIG_API_KEY: z.string().optional(),
  NCBI_EMAIL: z.string().optional(),
  OPENFDA_API_KEY: z.string().optional(),
  OMIM_API_KEY: z.string().optional(),
}

// Load environment variables
const env = {
  NCI_CADSR_API_KEY: process.env.NCI_CADSR_API_KEY,
  NCATS_TRANSLATOR_API_KEY: process.env.NCATS_TRANSLATOR_API_KEY,
  NHGRI_ANVIL_API_KEY: process.env.NHGRI_ANVIL_API_KEY,
  NIAID_IMMPORT_API_KEY: process.env.NIAID_IMMPORT_API_KEY,
  NINDS_NEUROMMSIG_API_KEY: process.env.NINDS_NEUROMMSIG_API_KEY,
  NCBI_EMAIL: process.env.NCBI_EMAIL,
  OPENFDA_API_KEY: process.env.OPENFDA_API_KEY,
  OMIM_API_KEY: process.env.OMIM_API_KEY,
}

// Validate environment variables
const validatedEnv = {
  NCI_CADSR_API_KEY: apiKeySchemas.NCI_CADSR_API_KEY.parse(env.NCI_CADSR_API_KEY),
  NCATS_TRANSLATOR_API_KEY: apiKeySchemas.NCATS_TRANSLATOR_API_KEY.parse(env.NCATS_TRANSLATOR_API_KEY),
  NHGRI_ANVIL_API_KEY: apiKeySchemas.NHGRI_ANVIL_API_KEY.parse(env.NHGRI_ANVIL_API_KEY),
  NIAID_IMMPORT_API_KEY: apiKeySchemas.NIAID_IMMPORT_API_KEY.parse(env.NIAID_IMMPORT_API_KEY),
  NINDS_NEUROMMSIG_API_KEY: apiKeySchemas.NINDS_NEUROMMSIG_API_KEY.parse(env.NINDS_NEUROMMSIG_API_KEY),
  NCBI_EMAIL: apiKeySchemas.NCBI_EMAIL.parse(env.NCBI_EMAIL),
  OPENFDA_API_KEY: apiKeySchemas.OPENFDA_API_KEY.parse(env.OPENFDA_API_KEY),
  OMIM_API_KEY: apiKeySchemas.OMIM_API_KEY.parse(env.OMIM_API_KEY),
}

/**
 * Get an API key for a specific service.
 * @param service - The service name (e.g., 'NCI_CADSR').
 * @returns The API key or undefined if not set.
 */
export function getApiKey(service: keyof typeof validatedEnv): string | undefined {
  return validatedEnv[service]
}

/**
 * Validate if required API keys are set.
 * @throws Error if required keys are missing.
 */
export function validateApiKeys(): void {
  const missingKeys: string[] = []
  
  if (!validatedEnv.NCBI_EMAIL) {
    missingKeys.push('NCBI_EMAIL')
  }
  
  if (missingKeys.length > 0) {
    throw new Error(`Missing required API keys: ${missingKeys.join(', ')}`)
  }
}

/**
 * Standardize API responses to match the app's data structure.
 * @param data - The raw API response.
 * @param source - The source API name.
 * @returns Standardized response.
 */
export function standardizeResponse<T>(data: T, source: string): { data: T; source: string; timestamp: string } {
  return {
    data,
    source,
    timestamp: new Date().toISOString(),
  }
}