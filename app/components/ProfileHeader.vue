<script setup lang="ts">
import type { KeytraceProfile } from '#shared/types/keytrace'

const props = defineProps<{
  profile?: KeytraceProfile
  loading?: boolean
}>()

const showAvatar = ref(true)

const initials = computed(() => {
  const source = props.profile?.name?.trim()
  if (!source) {
    return '?'
  }

  return source
    .split(' ')
    .map(part => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
})

watch(
  () => props.profile?.avatar,
  () => {
    showAvatar.value = true
  },
)

function onAvatarError() {
  // oxlint-disable-next-line no-console -- keep avatar load failures observable during development
  console.warn('[keytrace] profile avatar failed to load')
  showAvatar.value = false
}
</script>

<template>
  <section class="bg-bg-subtle border border-border rounded-lg p-4 sm:p-6">
    <div v-if="loading" class="flex items-center gap-4">
      <SkeletonBlock class="h-16 w-16 rounded-full" />
      <div class="flex-1 space-y-2">
        <SkeletonBlock class="h-6 w-40 rounded" />
        <SkeletonBlock class="h-4 w-full rounded" />
      </div>
    </div>

    <div v-else-if="profile" class="flex items-start gap-4">
      <div
        class="h-16 w-16 rounded-full bg-bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0"
      >
        <img
          v-if="profile.avatar && showAvatar"
          :src="profile.avatar"
          :alt="profile.name || 'Profile avatar'"
          class="h-full w-full object-cover"
          @error="onAvatarError"
        />
        <span v-else class="font-mono text-fg-subtle" aria-hidden="true">{{ initials }}</span>
      </div>

      <div class="min-w-0">
        <h2 class="font-mono text-xl sm:text-2xl font-medium min-w-0 break-words">
          {{ profile.name || 'Unknown Profile' }}
        </h2>
        <p class="mt-2 text-fg-muted min-w-0 break-words">{{ profile.description }}</p>
      </div>
    </div>
  </section>
</template>
