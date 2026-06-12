<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

import { useImageStore } from '@/stores/image'
import { useSettingsStore } from '@/stores/settings'
import { useViewerStore } from '@/stores/viewer'

const { t } = useI18n()
const imageStore = useImageStore()
const settingsStore = useSettingsStore()
const viewerStore = useViewerStore()
const { error, hasImage, loading, src } = storeToRefs(imageStore)
const viewer = useTemplateRef<HTMLElement>('viewer')
let resizeObserver: ResizeObserver | null = null
let dragPoint: { x: number; y: number } | null = null

const imageStyle = computed(() => ({
  width: `${imageStore.naturalWidth}px`,
  height: `${imageStore.naturalHeight}px`,
  transform: `translate(${viewerStore.offset.x}px, ${viewerStore.offset.y}px) scale(${viewerStore.zoom})`,
  transition: settingsStore.settings.viewer.smoothZoom && !viewerStore.isDragging ? 'transform 100ms ease-out' : 'none',
}))

function updateViewport() {
  if (!viewer.value) return
  viewerStore.setViewport(viewer.value.clientWidth, viewer.value.clientHeight)
  if (viewerStore.displayMode !== 'custom') viewerStore.applyDisplayMode(viewerStore.displayMode)
}

function handleLoad(event: Event) {
  const image = event.currentTarget as HTMLImageElement
  imageStore.markLoaded(image.naturalWidth, image.naturalHeight)
  viewerStore.setImageSize(image.naturalWidth, image.naturalHeight)
  if (viewerStore.displayMode === 'custom') return
  viewerStore.applyDisplayMode(viewerStore.displayMode)
}

function handleError() {
  imageStore.markError(new Error('image-load-failed'))
}

function handleWheel(event: WheelEvent) {
  if (!imageStore.hasImage) return
  event.preventDefault()
  const rect = viewer.value?.getBoundingClientRect()
  const point = settingsStore.settings.viewer.zoomToCursor && rect
    ? { x: event.clientX - rect.left, y: event.clientY - rect.top }
    : undefined
  if (event.deltaY < 0) viewerStore.zoomIn(settingsStore.settings.viewer.zoomStep, point)
  else viewerStore.zoomOut(settingsStore.settings.viewer.zoomStep, point)
}

function handlePointerDown(event: PointerEvent) {
  if (!imageStore.hasImage || !viewerStore.canPan || event.button !== 0) return
  dragPoint = { x: event.clientX, y: event.clientY }
  viewerStore.setDragging(true)
  viewer.value?.setPointerCapture(event.pointerId)
}

function handlePointerMove(event: PointerEvent) {
  if (!dragPoint) return
  viewerStore.moveBy(event.clientX - dragPoint.x, event.clientY - dragPoint.y)
  dragPoint = { x: event.clientX, y: event.clientY }
}

function handlePointerUp(event: PointerEvent) {
  dragPoint = null
  viewerStore.setDragging(false)
  viewer.value?.releasePointerCapture(event.pointerId)
}

function handleDoubleClick() {
  if (!imageStore.hasImage) return
  viewerStore.applyDisplayMode(viewerStore.displayMode === 'fit-window' ? 'actual-size' : 'fit-window')
}

watch(src, () => {
  viewerStore.setImageSize(0, 0)
})

onMounted(() => {
  resizeObserver = new ResizeObserver(updateViewport)
  if (viewer.value) resizeObserver.observe(viewer.value)
  updateViewport()
})
onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <section
    ref="viewer"
    class="image-viewer"
    :class="{ 'image-viewer--dragging': viewerStore.isDragging }"
    @dblclick="handleDoubleClick"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerUp"
    @wheel="handleWheel"
  >
    <img
      v-if="hasImage"
      class="image-viewer__image"
      :src="src"
      :style="imageStyle"
      :alt="imageStore.metadata?.name"
      draggable="false"
      @load="handleLoad"
      @error="handleError"
    >
    <a-spin v-if="loading" class="image-viewer__state" size="large" />
    <a-result v-else-if="error" class="image-viewer__state" status="error" :sub-title="t('placeholder.imageError')" />
    <div v-else-if="!hasImage" class="image-viewer__placeholder">
      <div class="image-viewer__icon" aria-hidden="true">PIC</div>
      <h1 class="image-viewer__title">{{ t('placeholder.viewerTitle') }}</h1>
      <p class="image-viewer__description">{{ t('placeholder.viewerDescription') }}</p>
    </div>
  </section>
</template>

<style scoped>
.image-viewer {
  position: relative;
  min-width: 0;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  background-color: var(--canvas-bg);
  background-image: radial-gradient(circle at center, var(--canvas-glow), transparent 55%);
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.image-viewer--dragging {
  cursor: grabbing;
}

.image-viewer__image {
  position: absolute;
  top: 0;
  left: 0;
  max-width: none;
  transform-origin: 0 0;
  image-rendering: auto;
  image-orientation: from-image;
  pointer-events: none;
  will-change: transform;
}

.image-viewer__state,
.image-viewer__placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.image-viewer__placeholder {
  width: min(420px, 90%);
  max-width: 420px;
  padding: 32px;
  text-align: center;
}

.image-viewer__icon {
  display: grid;
  width: 72px;
  height: 72px;
  margin: 0 auto;
  place-items: center;
  border: 2px solid currentColor;
  border-radius: 18px;
  color: #1677ff;
  font-size: 18px;
  font-weight: 700;
}

.image-viewer__title {
  margin: 18px 0 8px;
  font-size: 24px;
}

.image-viewer__description {
  margin: 0;
  color: var(--muted-color);
}
</style>
