<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { convertFileSrc } from '@tauri-apps/api/core'

import { useDirectoryStore } from '@/stores/directory'

const { t } = useI18n()
const directoryStore = useDirectoryStore()
const directoryName = computed(() => {
  const path = directoryStore.currentPath
  return path?.split(/[\\/]/).filter(Boolean).at(-1) ?? t('placeholder.directory')
})

function thumbnailSrc(path: string) {
  return convertFileSrc(path)
}
</script>

<template>
  <aside class="thumbnail-sidebar">
    <div class="thumbnail-sidebar__heading" :title="directoryStore.currentPath ?? undefined">{{ directoryName }}</div>
    <a-empty v-if="!directoryStore.entries.length" :description="t('placeholder.directoryEmpty')" />
    <button
      v-for="(entry, index) in directoryStore.entries"
      v-else
      :key="entry.path"
      class="thumbnail-sidebar__item"
      :class="{ 'thumbnail-sidebar__item--active': index === directoryStore.currentIndex }"
      :title="entry.path"
      @click="directoryStore.select(index)"
    >
      <img :src="thumbnailSrc(entry.path)" alt="" loading="lazy">
      <span>{{ entry.name }}</span>
    </button>
  </aside>
</template>

<style scoped>
.thumbnail-sidebar {
  width: 220px;
  min-height: 0;
  flex: 0 0 220px;
  padding: 14px;
  border-right: 1px solid var(--border-color);
  background: var(--panel-bg);
  overflow: auto;
}

.thumbnail-sidebar__heading {
  margin-bottom: 20px;
  font-weight: 600;
}

.thumbnail-sidebar__item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  padding: 6px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.thumbnail-sidebar__item:hover,
.thumbnail-sidebar__item--active {
  border-color: #1677ff;
  background: var(--canvas-glow);
}

.thumbnail-sidebar__item img {
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  border-radius: 5px;
  object-fit: cover;
}

.thumbnail-sidebar__item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.app-layout--thumbnails-bottom) .thumbnail-sidebar {
  width: auto;
  min-height: 138px;
  flex: 0 0 138px;
  border-top: 1px solid var(--border-color);
  border-right: 0;
}

:global(.app-layout--thumbnails-bottom) .thumbnail-sidebar__item {
  display: inline-flex;
  width: 180px;
  margin-right: 6px;
  vertical-align: top;
}
</style>
