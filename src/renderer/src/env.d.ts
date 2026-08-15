import type { Api } from '../../shared/types'

// 声明 preload 暴露给界面层的 window.api
declare global {
  interface Window {
    api: Api
  }
}

export {}
