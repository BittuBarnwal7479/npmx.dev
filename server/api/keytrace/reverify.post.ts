import {
  getClaimsForHandle,
  type ClaimVerificationResult,
} from "@keytrace/claims";
import type {
  KeytraceReverifyRequest,
  KeytraceReverifyResponse,
} from "#shared/types/keytrace";

function mapPlatformToClaimType(platform: string): string {
  if (platform === "mastodon") {
    return "activitypub";
  }
  return platform;
}

function getOptionalClaimField(
  claim: ClaimVerificationResult,
  key: string,
): string | undefined {
  const rawClaim = claim.claim as unknown as Record<string, unknown>;
  const value = rawClaim[key];
  return typeof value === "string" ? value : undefined;
}

function mapReverifyStatus(
  claim: ClaimVerificationResult,
): KeytraceReverifyResponse["status"] {
  const rawStatus = getOptionalClaimField(claim, "status");
  if (rawStatus === "failed" || rawStatus === "retracted" || claim.error) {
    return "failed";
  }
  if (rawStatus === "verified" || claim.verified) {
    return "verified";
  }
  return "unverified";
}

function matchesAccount(
  claim: ClaimVerificationResult,
  claimType: string,
  username: string,
  url?: string,
): boolean {
  if (claim.type !== claimType) {
    return false;
  }

  const normalizedSubject = claim.identity.subject.toLowerCase();
  const normalizedUsername = username.toLowerCase();
  if (normalizedSubject === normalizedUsername) {
    return true;
  }

  const profileUrl = (claim.identity.profileUrl || "").toLowerCase();
  const normalizedUrl = (url || "").toLowerCase();
  if (normalizedUrl && profileUrl && profileUrl === normalizedUrl) {
    return true;
  }

  return false;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<KeytraceReverifyRequest>(event);

  const identity = body?.identity?.trim().toLowerCase();
  const platform = body?.platform?.trim().toLowerCase();
  const username = body?.username?.trim();

  if (!identity || !platform || !username) {
    throw createError({
      statusCode: 400,
      message: "identity, platform and username are required",
    });
  }

  const result = await getClaimsForHandle(identity);
  const claimType = mapPlatformToClaimType(platform);
  const matchedClaim = result.claims.find((claim) =>
    matchesAccount(claim, claimType, username, body?.url),
  );

  if (!matchedClaim) {
    return {
      status: "unverified",
      lastCheckedAt: new Date().toISOString(),
      failureReason: "No matching Keytrace claim found for this account.",
    };
  }

  const response: KeytraceReverifyResponse = {
    status: mapReverifyStatus(matchedClaim),
    lastCheckedAt:
      getOptionalClaimField(matchedClaim, "lastVerifiedAt") ||
      matchedClaim.claim.retractedAt ||
      matchedClaim.claim.createdAt,
    failureReason: matchedClaim.error || undefined,
  };

  return response;
});
