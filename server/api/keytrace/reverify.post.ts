import type { KeytraceReverifyRequest, KeytraceReverifyResponse } from '#shared/types/keytrace'

export default defineEventHandler(async event => {
  const body = await readBody<KeytraceReverifyRequest>(event)

  const platform = body?.platform?.trim().toLowerCase()
  const username = body?.username?.trim()

  if (!platform || !username) {
    throw createError({
      statusCode: 400,
      message: 'platform and username are required',
    })
  }

  const lastCheckedAt = new Date().toISOString()

  // TODO: Implement per-platform proof verification for KeytraceReverifyResponse
  // construction here (including mastodon and npm short-username logic), ideally
  // via a verifyProofForPlatform(platform, username, proofData) helper.
  const response: KeytraceReverifyResponse = {
    status: 'unverified',
    lastCheckedAt,
    failureReason: 'Proof verification is not implemented yet.',
  }
  return response
})
