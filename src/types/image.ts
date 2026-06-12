/** 后端返回的图片文件条目。 */
export interface ImageEntry {
  path: string
  name: string
  size: number
  modified: number
}

/** open_directory 命令返回值。 */
export interface OpenDirectoryResult {
  directory: string
  entries: ImageEntry[]
}

export type OpenImageFileResult = ImageEntry | null
export type OpenDirectoryCommandResult = OpenDirectoryResult | null
export type ScanDirectoryResult = ImageEntry[]
