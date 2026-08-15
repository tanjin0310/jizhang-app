import { ipcMain } from 'electron'
import { addCategory, addRecord, deleteCategory, deleteRecord, listCategories, listRecords, updateRecord } from './db'
import type { NewRecord } from '../shared/types'

/** 注册界面层可调用的全部接口 */
export function registerIpcHandlers(): void {
  ipcMain.handle('category:list', () => listCategories())
  ipcMain.handle('category:add', (_event, parentId: number, name: string) => addCategory(parentId, name))
  ipcMain.handle('category:delete', (_event, id: number) => deleteCategory(id))
  ipcMain.handle('record:add', (_event, data: NewRecord) => addRecord(data))
  ipcMain.handle('record:list', (_event, filter?: { month?: string }) => listRecords(filter))
  ipcMain.handle('record:update', (_event, id: number, data: Partial<NewRecord>) => updateRecord(id, data))
  ipcMain.handle('record:delete', (_event, id: number) => deleteRecord(id))
}
