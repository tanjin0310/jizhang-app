import type { ElectronAPI } from '@electron-toolkit/preload'
import type { Api } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}

export {}
