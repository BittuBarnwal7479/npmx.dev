<script setup lang="ts">
import type { KeytraceAccount } from '#shared/types/keytrace'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const statusLegend = computed(() => [
  {
    label: t('profile.linked_accounts.status.verified'),
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  {
    label: t('profile.linked_accounts.status.unverified'),
    className: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  },
  {
    label: t('profile.linked_accounts.status.stale'),
    className: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  },
  {
    label: t('profile.linked_accounts.status.failed'),
    className: 'bg-red-500/15 text-red-300 border-red-500/30',
  },
])

const props = defineProps<{
  accounts: KeytraceAccount[]
  loading?: boolean
}>()

const verifiedCount = computed(
  () => props.accounts.filter(account => account.status === 'verified').length,
)
</script>

<template>
  <section class="bg-bg-subtle border border-border rounded-lg p-4 sm:p-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="font-mono text-xl sm:text-2xl font-medium">
        {{ $t('profile.linked_accounts.title') }}
      </h2>
      <p class="text-sm text-fg-muted">
        {{
          $t('profile.linked_accounts.verified_summary', {
            verified: verifiedCount,
            total: accounts.length,
          })
        }}
      </p>
    </div>

    <div
      class="mt-3 flex flex-wrap gap-2"
      :aria-label="$t('profile.linked_accounts.legend_aria_label')"
    >
      <span
        v-for="item in statusLegend"
        :key="item.label"
        class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-mono"
        :class="item.className"
      >
        {{ item.label }}
      </span>
    </div>

    <div v-if="loading" class="mt-4 space-y-2">
      <SkeletonBlock v-for="index in 3" :key="index" class="h-20 rounded-md" />
    </div>

    <p v-else-if="!accounts.length" class="mt-4 text-fg-muted">
      {{ $t('profile.linked_accounts.empty') }}
    </p>

    <ul v-else class="mt-4 space-y-2">
      <li v-for="account in accounts" :key="`${account.platform}-${account.username}`">
        <AccountItem :account="account" />
      </li>
    </ul>
  </section>
</template>
