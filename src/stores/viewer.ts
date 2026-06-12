import { computed, reactive, shallowRef } from 'vue'
import { defineStore } from 'pinia'

export type DisplayMode = 'fit-window' | 'fit-width' | 'actual-size' | 'custom'

const MIN_ZOOM = 0.01
const MAX_ZOOM = 32

export const useViewerStore = defineStore('viewer', () => {
  const zoom = shallowRef(1)
  const offset = reactive({ x: 0, y: 0 })
  const displayMode = shallowRef<DisplayMode>('fit-window')
  const isFullscreen = shallowRef(false)
  const isDragging = shallowRef(false)
  const viewport = reactive({ width: 0, height: 0 })
  const image = reactive({ width: 0, height: 0 })
  const canPan = computed(() =>
    image.width * zoom.value > viewport.width || image.height * zoom.value > viewport.height,
  )

  function setViewport(width: number, height: number) {
    viewport.width = width
    viewport.height = height
  }

  function setImageSize(width: number, height: number) {
    image.width = width
    image.height = height
  }

  function applyDisplayMode(mode: Exclude<DisplayMode, 'custom'>) {
    displayMode.value = mode
    if (!image.width || !image.height || !viewport.width || !viewport.height) return
    const availableWidth = Math.max(viewport.width - 32, 1)
    const availableHeight = Math.max(viewport.height - 32, 1)
    const nextZoom = mode === 'actual-size'
      ? 1
      : mode === 'fit-width'
        ? availableWidth / image.width
        : Math.min(availableWidth / image.width, availableHeight / image.height)
    zoom.value = clampZoom(nextZoom)
    centerImage()
  }

  function resetView(mode: Exclude<DisplayMode, 'custom'> = 'fit-window') {
    offset.x = 0
    offset.y = 0
    applyDisplayMode(mode)
  }

  function centerImage() {
    offset.x = (viewport.width - image.width * zoom.value) / 2
    offset.y = (viewport.height - image.height * zoom.value) / 2
  }

  function setZoom(nextZoom: number, point?: { x: number; y: number }) {
    const clamped = clampZoom(nextZoom)
    const anchor = point ?? { x: viewport.width / 2, y: viewport.height / 2 }
    const ratio = clamped / zoom.value
    offset.x = anchor.x - (anchor.x - offset.x) * ratio
    offset.y = anchor.y - (anchor.y - offset.y) * ratio
    zoom.value = clamped
    displayMode.value = Math.abs(clamped - 1) < 0.0001 ? 'actual-size' : 'custom'
  }

  function zoomIn(step = 0.1, point?: { x: number; y: number }) {
    setZoom(zoom.value * (1 + step), point)
  }

  function zoomOut(step = 0.1, point?: { x: number; y: number }) {
    setZoom(zoom.value / (1 + step), point)
  }

  function moveBy(x: number, y: number) {
    if (!canPan.value) return
    offset.x += x
    offset.y += y
    displayMode.value = 'custom'
  }

  /** 切图时保留当前 zoom 与 offset，避免图片加载后重新套用适配模式。 */
  function preserveView() {
    displayMode.value = 'custom'
  }

  function setDragging(value: boolean) {
    isDragging.value = value
  }

  function setFullscreen(value: boolean) {
    isFullscreen.value = value
  }

  return {
    zoom,
    offset,
    displayMode,
    isFullscreen,
    isDragging,
    viewport,
    image,
    canPan,
    setViewport,
    setImageSize,
    applyDisplayMode,
    resetView,
    setZoom,
    zoomIn,
    zoomOut,
    moveBy,
    preserveView,
    setDragging,
    setFullscreen,
  }
})

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}
