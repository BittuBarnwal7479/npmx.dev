<script setup lang="ts">
const colorMode = useColorMode()
const appConfig = useAppConfig()

const modes = computed(() => [
  {
    label: 'System',
    value: 'system',
    icon: appConfig.ui.icons.system,
  },
  {
    label: 'Light',
    value: 'light',
    icon: appConfig.ui.icons.light,
  },
  {
    label: 'Dark',
    value: 'dark',
    icon: appConfig.ui.icons.dark,
  },
])

const activeMode = computed(() => {
  return modes.value.find(mode => mode.value === colorMode.preference) || modes.value[0]
})

const items = computed(() => [
  modes.value.map(mode => ({
    ...mode,
    type: 'checkbox' as const,
    checked: colorMode.preference === mode.value,
    onSelect() {
      colorMode.preference = mode.value
    },
  })),
])
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{
      align: 'end',
      side: 'bottom',
      sideOffset: 8,
    }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      :icon="activeMode?.icon"
      :aria-label="`Color mode: ${activeMode?.label}`"
    />
  </UDropdownMenu>
</template>
