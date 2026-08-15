import type { Api } from '../../shared/types'

// 通过 preload 暴露的 window.api 调用主进程能力
export const api: Api = window.api
