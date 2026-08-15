// 主进程与界面层共用的数据类型定义

/** 收支类型 */
export type RecordType = 'expense' | 'income'

/** 分类（一级大类或二级小类，parentId 为 null 表示一级大类） */
export interface Category {
  id: number
  parentId: number | null
  name: string
  icon: string
  isBuiltin: number
  sortOrder: number
  type: RecordType
}

/** 一笔记账记录（返回给界面时已附带分类名称信息） */
export interface RecordItem {
  id: number
  categoryId: number
  parentId: number
  amountCents: number
  date: string
  note: string
  type: RecordType
  createdAt: string
  updatedAt: string
  categoryName: string
  icon: string
  parentName: string
  parentIcon: string
}

/** 新增一笔记录的数据（金额单位为分，避免小数误差） */
export interface NewRecord {
  categoryId: number
  amountCents: number
  date: string
  note: string
  type: RecordType
}

/** 界面通过 window.api 可调用的全部功能 */
export interface Api {
  listCategories(): Promise<Category[]>
  addCategory(parentId: number, name: string): Promise<number>
  deleteCategory(id: number): Promise<void>
  addRecord(data: NewRecord): Promise<number>
  listRecords(filter?: { month?: string }): Promise<RecordItem[]>
  updateRecord(id: number, data: Partial<NewRecord>): Promise<void>
  deleteRecord(id: number): Promise<void>
}
