import { computed, reactive, shallowRef } from 'vue'
import { defineStore } from 'pinia'

export type DisplayMode = 'fit-window' | 'fit-width' | 'actual-size' | 'custom'

const MIN_ZOOM = 0.01
const MAX_ZOOM = 32
const MIN_VISIBLE_PIXELS = 64

export const useViewerStore = defineStore('viewer', () => {
  const zoom = shallowRef(1)
  const offset = reactive({ x: 0, y: 0 })
  const displayMode = shallowRef<DisplayMode>('fit-window')
  const isFullscreen = shallowRef(false)
  const isDragging = shallowRef(false)
  const viewport = reactive({ width: 0, height: 0 })
  const image = reactive({ width: 0, height: 0 })
  const preservedCenter = shallowRef<{ x: number; y: number } | null>(null)
  const canPan = computed(() =>
    image.width * zoom.value > viewport.width || image.height * zoom.value > viewport.height,
  )

  function setViewport(width: number, height: number) {
    viewport.width = width
    viewport.height = height
    clampOffset()
  }

  function setImageSize(width: number, height: number) {
    image.width = width
    image.height = height
    if (width && height && preservedCenter.value) {
      offset.x = viewport.width / 2 - preservedCenter.value.x * width * zoom.value
      offset.y = viewport.height / 2 - preservedCenter.value.y * height * zoom.value
      preservedCenter.value = null
      clampOffset()
    }
  }

  function applyDisplayMode(mode: Exclude<DisplayMode, 'custom'>) {
    preservedCenter.value = null
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
    preservedCenter.value = null
    offset.x = 0
    offset.y = 0
    applyDisplayMode(mode)
  }

  function centerImage() {
    offset.x = (viewport.width - image.width * zoom.value) / 2
    offset.y = displayMode.value === 'fit-width'
      ? Math.max(0, (viewport.height - image.height * zoom.value) / 2)
      : (viewport.height - image.height * zoom.value) / 2
  }

  function setZoom(nextZoom: number, point?: { x: number; y: number }) {
    const clamped = clampZoom(nextZoom)
    const anchor = point ?? { x: viewport.width / 2, y: viewport.height / 2 }
    const ratio = clamped / zoom.value
    offset.x = anchor.x - (anchor.x - offset.x) * ratio
    offset.y = anchor.y - (anchor.y - offset.y) * ratio
    zoom.value = clamped
    displayMode.value = 'custom'
    clampOffset()
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
    clampOffset()
  }

  /** 切图时按视口中心在旧图中的相对位置映射到新图。 */
  function preserveView() {
    if (image.width && image.height && zoom.value) {
      preservedCenter.value = {
        x: clampUnit((viewport.width / 2 - offset.x) / (image.width * zoom.value)),
        y: clampUnit((viewport.height / 2 - offset.y) / (image.height * zoom.value)),
      }
    }
    displayMode.value = 'custom'
  }

  function clampOffset() {
    if (!image.width || !image.height || !viewport.width || !viewport.height) return
    offset.x = clampAxis(offset.x, image.width * zoom.value, viewport.width)
    offset.y = clampAxis(offset.y, image.height * zoom.value, viewport.height)
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

function clampAxis(offset: number, contentSize: number, viewportSize: number) {
  if (contentSize <= viewportSize) return (viewportSize - contentSize) / 2
  const visible = Math.min(MIN_VISIBLE_PIXELS, viewportSize / 2)
  return Math.min(viewportSize - visible, Math.max(visible - contentSize, offset))
}

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value))
}
