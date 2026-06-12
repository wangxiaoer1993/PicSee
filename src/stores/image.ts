import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { convertFileSrc } from '@tauri-apps/api/core'

import type { ImageEntry } from '@/types/image'

export const useImageStore = defineStore('image', () => {
  const metadata = shallowRef<ImageEntry | null>(null)
  const src = shallowRef('')
  const loading = shallowRef(false)
  const error = shallowRef<unknown | null>(null)
  const naturalWidth = shallowRef(0)
  const naturalHeight = shallowRef(0)

  const hasImage = computed(() => Boolean(metadata.value && src.value))

  /** 设置当前图片资源，并等待 img 元素报告真实解码尺寸。 */
  function setCurrent(entry: ImageEntry | null) {
    metadata.value = entry
    src.value = entry ? convertFileSrc(entry.path) : ''
    loading.value = Boolean(entry)
    error.value = null
    naturalWidth.value = 0
    naturalHeight.value = 0
  }

  function markLoaded(width: number, height: number) {
    naturalWidth.value = width
    naturalHeight.value = height
    loading.value = false
    error.value = null
  }

  function markError(reason: unknown) {
    loading.value = false
    error.value = reason
  }

  return { metadata, src, loading, error, naturalWidth, naturalHeight, hasImage, setCurrent, markLoaded, markError }
})
