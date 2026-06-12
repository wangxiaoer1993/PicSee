import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'

import type {
  ImageEntry,
  OpenDirectoryCommandResult,
  OpenImageFileResult,
  ScanDirectoryResult,
} from '@/types/image'

export const useDirectoryStore = defineStore('directory', () => {
  const currentPath = shallowRef<string | null>(null)
  const entries = ref<ImageEntry[]>([])
  const currentIndex = shallowRef(-1)
  const loading = shallowRef(false)
  const error = shallowRef<unknown | null>(null)

  const currentEntry = computed(() => entries.value[currentIndex.value] ?? null)
  const hasPrevious = computed(() => currentIndex.value > 0)
  const hasNext = computed(() => currentIndex.value >= 0 && currentIndex.value < entries.value.length - 1)

  /** 打开单图后立即显示，再在后台补齐同目录图片列表。 */
  async function openImageFile() {
    error.value = null
    try {
      const entry = await invoke<OpenImageFileResult>('open_image_file')
      if (!entry) return
      const directory = parentDirectory(entry.path)
      currentPath.value = directory
      entries.value = [entry]
      currentIndex.value = 0
      void scanDirectory(directory, entry.path)
    } catch (reason) {
      error.value = reason
    }
  }

  async function openDirectory() {
    loading.value = true
    error.value = null
    try {
      const result = await invoke<OpenDirectoryCommandResult>('open_directory')
      if (!result) return
      currentPath.value = result.directory
      entries.value = result.entries
      currentIndex.value = result.entries.length ? 0 : -1
    } catch (reason) {
      error.value = reason
    } finally {
      loading.value = false
    }
  }

  async function scanDirectory(path: string, selectedPath?: string) {
    loading.value = true
    try {
      const result = await invoke<ScanDirectoryResult>('scan_directory', { path })
      if (currentPath.value !== path) return
      const targetPath = selectedPath ?? currentEntry.value?.path
      entries.value = result
      const targetIndex = targetPath ? result.findIndex(entry => entry.path === targetPath) : -1
      currentIndex.value = targetIndex >= 0 ? targetIndex : result.length ? 0 : -1
    } catch (reason) {
      error.value = reason
    } finally {
      loading.value = false
    }
  }

  function select(index: number) {
    if (index >= 0 && index < entries.value.length) currentIndex.value = index
  }

  function selectPrevious() {
    if (hasPrevious.value) currentIndex.value -= 1
  }

  function selectNext() {
    if (hasNext.value) currentIndex.value += 1
  }

  return {
    currentPath,
    entries,
    currentIndex,
    currentEntry,
    hasPrevious,
    hasNext,
    loading,
    error,
    openImageFile,
    openDirectory,
    scanDirectory,
    select,
    selectPrevious,
    selectNext,
  }
})

function parentDirectory(path: string) {
  const separatorIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return separatorIndex > 0 ? path.slice(0, separatorIndex) : path
}
