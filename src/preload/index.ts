import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Api, NewRecord } from '../shared/types'

// 界面层可以安全调用的接口（不直接暴露 Node 能力）
const api: Api = {
  listCategories: () => ipcRenderer.invoke('category:list'),
  addCategory: (parentId: number, name: string) => ipcRenderer.invoke('category:add', parentId, name),
  deleteCategory: (id: number) => ipcRenderer.invoke('category:delete', id),
  addRecord: (data: NewRecord) => ipcRenderer.invoke('record:add', data),
  listRecords: (filter?: { month?: string }) => ipcRenderer.invoke('record:list', filter),
  updateRecord: (id: number, data: Partial<NewRecord>) => ipcRenderer.invoke('record:update', id, data),
  deleteRecord: (id: number) => ipcRenderer.invoke('record:delete', id)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
