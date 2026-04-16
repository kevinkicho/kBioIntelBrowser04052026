/**
 * Utility functions for API key management, loading, and validation.
 */

import { z } from "zod"

const apiKeySchemas = {
  NCI_CADSR_API_KEY: z.string().optional(),
  NCATS_TRANSLATOR_API_KEY: z.string().optional(), 
  NHGRI_ANVIL_API_KEY: z.string().optional(),
  NIAID_IMMPORT_API_KEY: z.string().optional(),
  NINDS_NEUROMMSIG_API_KEY: z.string().optional(),
  NCBI_EMAIL: z.string().optional(),
  NCBI_API_KEY: z.string().optional(),
  OPENFDA_API_KEY: z.string().optional(),
  OMIM_API_KEY: z.string().optional(),
  CHEMSPIDER_API_KEY: z.string().optional(),
}

const env = {
  NCI_CADSR_API_KEY: process.env.NCI_CADSR_API_KEY,
  NCATS_TRANSLATOR_API_KEY: process.env.NCATS_TRANSLATOR_API_KEY,
  NHGRI_ANVIL_API_KEY: process.env.NHGRI_ANVIL_API_KEY,
  NIAID_IMMPORT_API_KEY: process.env.NIAID_IMMPORT_API_KEY,
  NINDS_NEUROMMSIG_API_KEY: process.env.NINDS_NEUROMMSIG_API_KEY,
  NCBI_EMAIL: process.env.NCBI_EMAIL,
  NCBI_API_KEY: process.env.NCBI_API_KEY,
  OPENFDA_API_KEY: process.env.OPENFDA_API_KEY,
  OMIM_API_KEY: process.env.OMIM_API_KEY,
  CHEMSPIDER_API_KEY: process.env.CHEMSPIDER_API_KEY,
}

const validatedEnv = {
  NCI_CADSR_API_KEY: apiKeySchemas.NCI_CADSR_API_KEY.parse(env.NCI_CADSR_API_KEY),
  NCATS_TRANSLATOR_API_KEY: apiKeySchemas.NCATS_TRANSLATOR_API_KEY.parse(env.NCATS_TRANSLATOR_API_KEY),
  NHGRI_ANVIL_API_KEY: apiKeySchemas.NHGRI_ANVIL_API_KEY.parse(env.NHGRI_ANVIL_API_KEY),
  NIAID_IMMPORT_API_KEY: apiKeySchemas.NIAID_IMMPORT_API_KEY.parse(env.NIAID_IMMPORT_API_KEY),
  NINDS_NEUROMMSIG_API_KEY: apiKeySchemas.NINDS_NEUROMMSIG_API_KEY.parse(env.NINDS_NEUROMMSIG_API_KEY),
  NCBI_EMAIL: apiKeySchemas.NCBI_EMAIL.parse(env.NCBI_EMAIL),
  NCBI_API_KEY: apiKeySchemas.NCBI_API_KEY.parse(env.NCBI_API_KEY),
  OPENFDA_API_KEY: apiKeySchemas.OPENFDA_API_KEY.parse(env.OPENFDA_API_KEY),
  OMIM_API_KEY: apiKeySchemas.OMIM_API_KEY.parse(env.OMIM_API_KEY),
  CHEMSPIDER_API_KEY: apiKeySchemas.CHEMSPIDER_API_KEY.parse(env.CHEMSPIDER_API_KEY),
}

export type ApiKeyService = keyof typeof validatedEnv

export function getApiKey(service: ApiKeyService): string | undefined {
  return validatedEnv[service]
}

export function standardizeResponse<T>(data: T, source: string): { data: T; source: string; timestamp: string } {
  return {
    data,
    source,
    timestamp: new Date().toISOString(),
  }
}