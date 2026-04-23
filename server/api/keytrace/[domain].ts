import type { KeytraceResponse } from "#shared/types/keytrace";

const MOCK_KEYTRACE_PROFILES: Record<string, KeytraceResponse> = {
  "npmx.dev": {
    profile: {
      name: "npmx Team",
      avatar: "https://api.dicebear.com/9.x/shapes/svg?seed=npmx",
      banner:
        "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1400&q=80",
      description:
        "Open source developers building better tooling around package discovery.",
    },
    accounts: [
      {
        platform: "github",
        username: "npmx-dev",
        displayName: "npmx-dev",
        avatar: "https://avatars.githubusercontent.com/u/178563400?v=4",
        url: "https://github.com/npmx-dev",
        status: "verified",
        proofMethod: "github",
        addedAt: "2026-03-10T12:00:00.000Z",
        lastCheckedAt: "2026-04-20T09:30:00.000Z",
      },
      {
        platform: "npm",
        username: "npmx",
        displayName: "npmx",
        avatar: "https://api.dicebear.com/9.x/identicon/svg?seed=npmx",
        url: "https://www.npmjs.com/~npmx",
        status: "stale",
        proofMethod: "npm",
        addedAt: "2026-02-18T15:20:00.000Z",
        lastCheckedAt: "2026-03-05T08:00:00.000Z",
        failureReason: "Proof has not been re-verified recently.",
      },
      {
        platform: "mastodon",
        username: "@npmx@fosstodon.org",
        displayName: "npmx",
        avatar:
          "https://api.dicebear.com/9.x/identicon/svg?seed=fosstodon-npmx",
        url: "https://fosstodon.org/@npmx",
        status: "failed",
        proofMethod: "mastodon",
        addedAt: "2026-01-22T11:40:00.000Z",
        lastCheckedAt: "2026-04-19T22:15:00.000Z",
        failureReason:
          "Linked proof URL could not be resolved during verification.",
      },
    ],
  },
  "empty.dev": {
    profile: {
      name: "Empty Developer",
      avatar: "https://api.dicebear.com/9.x/initials/svg?seed=empty.dev",
      description: "A profile with no linked accounts yet.",
    },
    accounts: [],
  },
};

function domainToDisplayName(domain: string): string {
  const firstSegment = domain.split(".")[0] || domain;
  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
}

function buildFallbackProfile(domain: string): KeytraceResponse {
  return {
    profile: {
      name: `${domainToDisplayName(domain)} Developer`,
      avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(domain)}`,
      description: `Mock identity profile for ${domain}.`,
    },
    accounts: [
      {
        platform: "github",
        username: domain,
        displayName: domain,
        avatar: `https://api.dicebear.com/9.x/identicon/svg?seed=github-${encodeURIComponent(domain)}`,
        url: `https://github.com/${domain}`,
        status: "verified",
        proofMethod: "github",
        addedAt: "2026-04-01T10:00:00.000Z",
        lastCheckedAt: "2026-04-21T10:00:00.000Z",
      },
      {
        platform: "npm",
        username: domain,
        displayName: domain,
        avatar: `https://api.dicebear.com/9.x/identicon/svg?seed=npm-${encodeURIComponent(domain)}`,
        url: `https://www.npmjs.com/~${domain}`,
        status: "unverified",
        proofMethod: "npm",
        addedAt: "2026-04-01T10:00:00.000Z",
        lastCheckedAt: "2026-04-01T10:00:00.000Z",
        failureReason: "Proof exists but has not been verified yet.",
      },
      {
        platform: "mastodon",
        username: `@${domain}@mastodon.social`,
        displayName: domain,
        avatar: `https://api.dicebear.com/9.x/identicon/svg?seed=mastodon-${encodeURIComponent(domain)}`,
        url: `https://mastodon.social/@${encodeURIComponent(domain)}`,
        status: "stale",
        proofMethod: "mastodon",
        addedAt: "2026-04-01T10:00:00.000Z",
        lastCheckedAt: "2026-04-08T10:00:00.000Z",
        failureReason: "Verification check is out of date.",
      },
    ],
  };
}

export default defineEventHandler((event) => {
  const domain = getRouterParam(event, "domain")?.trim().toLowerCase();
  if (!domain) {
    throw createError({
      statusCode: 400,
      message: "Domain is required",
    });
  }

  return MOCK_KEYTRACE_PROFILES[domain] ?? buildFallbackProfile(domain);
});
