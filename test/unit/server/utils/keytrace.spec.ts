import type { ClaimVerificationResult } from '@keytrace/claims'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getOptionalClaimField,
  isStaleIsoDate,
  mapClaimTypeToPlatform,
  mapKeytraceVerificationStatus,
  mapPlatformToClaimType,
} from '#server/utils/keytrace'

function createClaim(
  options: {
    verified?: boolean
    error?: string
    status?: string
    lastVerifiedAt?: string
  } = {},
): ClaimVerificationResult {
  const { status, lastVerifiedAt, ...result } = options

  return {
    uri: 'at://did:plc:example/dev.keytrace.claim/example',
    rkey: 'example',
    type: 'github',
    claimUri: 'https://github.com/example',
    verified: false,
    steps: [],
    identity: {
      subject: 'example',
    },
    claim: {
      $type: 'dev.keytrace.claim',
      type: 'github',
      claimUri: 'https://github.com/example',
      identity: {
        subject: 'example',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      ...(status === undefined ? {} : { status }),
      ...(lastVerifiedAt === undefined ? {} : { lastVerifiedAt }),
    },
    ...result,
  } as ClaimVerificationResult
}

afterEach(() => {
  vi.useRealTimers()
})

describe('keytrace utilities', () => {
  it.each([
    ['github', 'github'],
    ['mastodon', 'activitypub'],
    ['bluesky', 'bsky'],
    ['npm', 'npm'],
    ['unknown', 'unknown'],
  ])('maps platform %s to claim type %s', (platform, claimType) => {
    expect(mapPlatformToClaimType(platform)).toBe(claimType)
  })

  it.each([
    ['github', 'github'],
    ['activitypub', 'mastodon'],
    ['bsky', 'bluesky'],
    ['npm', 'npm'],
    ['unknown', 'unknown'],
  ])('maps claim type %s to platform %s', (claimType, platform) => {
    expect(mapClaimTypeToPlatform(claimType)).toBe(platform)
  })

  it('returns optional string fields from the raw claim record', () => {
    const claim = createClaim({
      status: 'verified',
      lastVerifiedAt: '2026-01-01T00:00:00.000Z',
    })

    expect(getOptionalClaimField(claim, 'status')).toBe('verified')
    expect(getOptionalClaimField(claim, 'lastVerifiedAt')).toBe('2026-01-01T00:00:00.000Z')
    expect(getOptionalClaimField(claim, 'identity')).toBeUndefined()
    expect(getOptionalClaimField(claim, 'missing')).toBeUndefined()
  })

  describe('isStaleIsoDate', () => {
    it('uses a strict 30-day threshold', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-02-01T00:00:00.000Z'))

      expect(isStaleIsoDate('2026-01-02T00:00:00.000Z')).toBe(false)
      expect(isStaleIsoDate('2026-01-01T23:59:59.999Z')).toBe(true)
    })

    it('ignores missing and invalid dates', () => {
      expect(isStaleIsoDate(undefined)).toBe(false)
      expect(isStaleIsoDate('not-a-date')).toBe(false)
    })
  })

  describe('mapKeytraceVerificationStatus', () => {
    it.each(['failed', 'retracted'])('maps raw %s status to failed', status => {
      expect(mapKeytraceVerificationStatus(createClaim({ status, verified: true }))).toBe('failed')
    })

    it('maps a current verified claim to verified', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-02-01T00:00:00.000Z'))

      const claim = createClaim({
        status: 'verified',
        lastVerifiedAt: '2026-01-15T00:00:00.000Z',
      })

      expect(mapKeytraceVerificationStatus(claim)).toBe('verified')
    })

    it('maps a verified claim older than 30 days to stale', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-02-01T00:00:00.000Z'))

      const claim = createClaim({
        verified: true,
        lastVerifiedAt: '2026-01-01T00:00:00.000Z',
      })

      expect(mapKeytraceVerificationStatus(claim)).toBe('stale')
    })

    it('maps verification errors to failed', () => {
      expect(mapKeytraceVerificationStatus(createClaim({ error: 'Invalid signature' }))).toBe(
        'failed',
      )
    })

    it('maps claims without verification evidence to unverified', () => {
      expect(mapKeytraceVerificationStatus(createClaim())).toBe('unverified')
    })
  })
})
