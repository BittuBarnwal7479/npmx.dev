import { getClaimsForHandle, type ClaimVerificationResult } from '@keytrace/claims'
import type { KeytraceProofMethod, KeytraceResponse } from '#shared/types/keytrace'

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

// Map Keytrace claim types to our platform names
function mapPlatformType(type: string): string {
  const platformMap: Record<string, string> = {
    github: 'github',
    dns: 'dns',
    activitypub: 'mastodon',
    bsky: 'bluesky',
    npm: 'npm',
    tangled: 'tangled',
    pgp: 'pgp',
    twitter: 'twitter',
    linkedin: 'linkedin',
    instagram: 'instagram',
    reddit: 'reddit',
    hackernews: 'hackernews',
    orcid: 'orcid',
    itchio: 'itchio',
    discord: 'discord',
    steam: 'steam',
  }
  return platformMap[type] || type
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
  const mappedType = mapPlatformType(type)
  return allowedProofMethods.has(mappedType as KeytraceProofMethod)
    ? (mappedType as KeytraceProofMethod)
    : 'other'
}

const STALE_THRESHOLD_DAYS = 30

function getOptionalClaimField(claim: ClaimVerificationResult, key: string): string | undefined {
  const rawClaim = claim.claim as unknown as Record<string, unknown>
  const value = rawClaim[key]
  return typeof value === 'string' ? value : undefined
}

function isStaleIsoDate(isoDate: string | undefined): boolean {
  if (!isoDate) {
    return false
  }

  const timestamp = Date.parse(isoDate)
  if (Number.isNaN(timestamp)) {
    return false
  }

  return Date.now() - timestamp > STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000
}

function mapVerificationStatus(
  claim: ClaimVerificationResult,
): 'verified' | 'unverified' | 'stale' | 'failed' {
  const rawStatus = getOptionalClaimField(claim, 'status')
  const lastVerifiedAt = getOptionalClaimField(claim, 'lastVerifiedAt')

  if (rawStatus === 'failed' || rawStatus === 'retracted') {
    return 'failed'
  }

  if (rawStatus === 'verified') {
    return isStaleIsoDate(lastVerifiedAt) ? 'stale' : 'verified'
  }

  if (claim.error) {
    return 'failed'
  }

  if (claim.verified) {
    return isStaleIsoDate(lastVerifiedAt) ? 'stale' : 'verified'
  }

  return 'unverified'
}

// Convert Keytrace claims to our account format
function mapClaimsToAccounts(claims: ClaimVerificationResult[]): KeytraceResponse['accounts'] {
  return claims.map(claim => ({
    platform: mapPlatformType(claim.type),
    username: claim.identity.subject,
    displayName: claim.identity.displayName || claim.identity.subject,
    avatar: claim.identity.avatarUrl || undefined,
    url: claim.identity.profileUrl || undefined,
    status: mapVerificationStatus(claim),
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
