import { getClaimsForHandle, type ClaimVerificationResult } from '@keytrace/claims'
import type { KeytraceProofMethod, KeytraceResponse } from '#shared/types/keytrace'
import {
  getOptionalClaimField,
  mapKeytraceVerificationStatus,
  mapClaimTypeToPlatform,
} from '#server/utils/keytrace'

function domainToDisplayName(domain: string): string {
  const firstSegment = domain.split('.')[0] || domain
  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1)
}

function buildFallbackProfile(domain: string): KeytraceResponse {
  return {
    profile: {
      name: `${domainToDisplayName(domain)} Developer`,
      avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(domain)}`,
      description: `No Keytrace claims found for ${domain}.`,
    },
    accounts: [],
  }
}

function buildServiceUnavailableProfile(domain: string): KeytraceResponse {
  return {
    profile: {
      name: `${domainToDisplayName(domain)} Developer`,
      avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(domain)}`,
      description: 'Keytrace is temporarily unavailable. Please try again shortly.',
    },
    accounts: [],
  }
}

const allowedProofMethods = new Set<KeytraceProofMethod>([
  'dns',
  'github',
  'npm',
  'mastodon',
  'pgp',
  'other',
])

function mapProofMethod(type: string): KeytraceProofMethod {
  const mappedType = mapClaimTypeToPlatform(type)
  return allowedProofMethods.has(mappedType as KeytraceProofMethod)
    ? (mappedType as KeytraceProofMethod)
    : 'other'
}

// Convert Keytrace claims to our account format
function mapClaimsToAccounts(claims: ClaimVerificationResult[]): KeytraceResponse['accounts'] {
  return claims.map(claim => ({
    platform: mapClaimTypeToPlatform(claim.type),
    username: claim.identity.subject,
    displayName: claim.identity.displayName || claim.identity.subject,
    avatar: claim.identity.avatarUrl || undefined,
    url: claim.identity.profileUrl || undefined,
    status: mapKeytraceVerificationStatus(claim),
    proofMethod: mapProofMethod(claim.type),
    addedAt: claim.claim.createdAt,
    lastCheckedAt:
      getOptionalClaimField(claim, 'lastVerifiedAt') ||
      claim.claim.retractedAt ||
      claim.claim.createdAt,
    failureReason: claim.error || undefined,
  }))
}

type KeytraceFetchResult =
  | { kind: 'success'; data: KeytraceResponse }
  | { kind: 'no-claims' }
  | { kind: 'error'; error: unknown }

// Fetch real Keytrace profile data
async function fetchKeytraceProfile(domain: string): Promise<KeytraceFetchResult> {
  try {
    const result = await getClaimsForHandle(domain)

    if (!result.claims || result.claims.length === 0) {
      return { kind: 'no-claims' }
    }

    // Build profile from first claim's identity (they all belong to the same DID)
    const firstClaim = result.claims[0]
    if (!firstClaim) {
      return { kind: 'no-claims' }
    }

    return {
      kind: 'success',
      data: {
        profile: {
          name: firstClaim.identity.displayName || domainToDisplayName(domain),
          avatar:
            firstClaim.identity.avatarUrl ||
            `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(domain)}`,
          description: `Identity profile for ${domain}`,
        },
        accounts: mapClaimsToAccounts(result.claims),
      },
    }
  } catch (error) {
    console.error('Failed to fetch Keytrace profile:', error)
    return { kind: 'error', error }
  }
}

export default defineEventHandler(async event => {
  const domain = getRouterParam(event, 'domain')?.trim().toLowerCase()
  if (!domain) {
    throw createError({
      statusCode: 400,
      message: 'Domain is required',
    })
  }

  // Try to fetch real Keytrace data
  const keytraceData = await fetchKeytraceProfile(domain)

  if (keytraceData.kind === 'success') {
    return keytraceData.data
  }

  if (keytraceData.kind === 'no-claims') {
    return buildFallbackProfile(domain)
  }

  // If Keytrace is unavailable and mock mode isn't allowed, return a neutral profile.
  return buildServiceUnavailableProfile(domain)
})
