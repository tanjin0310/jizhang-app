import { app } from 'electron'
import { join } from 'path'
import fs from 'fs'
import Database from 'better-sqlite3'
import type { Category, NewRecord, RecordItem, RecordType } from '../shared/types'

// 内置支出分类体系（与 CLAUDE.md 第 4 节一致）
const BUILTIN_CATEGORIES: { icon: string; name: string; children: string[] }[] = [
  { icon: '🍜', name: '餐饮', children: ['早餐', '午餐', '晚餐', '零食', '饮料咖啡', '外卖', '聚餐'] },
  { icon: '🚗', name: '交通', children: ['公交地铁', '打车', '火车高铁', '飞机', '加油', '停车费'] },
  { icon: '🏠', name: '居住', children: ['房租', '水电燃气', '物业费', '宽带网络', '家居用品', '维修维护'] },
  { icon: '🛒', name: '购物', children: ['日用品', '服装鞋包', '数码电子', '美妆护肤', '家居家电'] },
  { icon: '🎮', name: '娱乐', children: ['电影演出', '游戏', '旅游出行', '运动健身', '会员订阅'] },
  { icon: '💊', name: '医疗健康', children: ['看病买药', '体检保健'] },
  { icon: '📚', name: '学习教育', children: ['书籍教材', '课程培训', '文具用品'] },
  { icon: '🧧', name: '人情往来', children: ['红包礼金', '礼物赠送', '请客'] },
  { icon: '📱', name: '通讯', children: ['手机话费', '网络流量'] },
  { icon: '📦', name: '其他', children: ['其他支出'] }
]

// 内置收入分类体系（与 CLAUDE.md 第 4 节一致）
const BUILTIN_INCOME_CATEGORIES: { icon: string; name: string; children: string[] }[] = [
  { icon: '💰', name: '工资薪酬', children: ['月薪工资', '奖金提成', '加班补贴'] },
  { icon: '📈', name: '投资理财', children: ['利息收益', '股票基金', '房租收入'] },
  { icon: '🧧', name: '红包礼金', children: ['红包收入', '礼金收入'] },
  { icon: '💼', name: '兼职外快', children: ['兼职收入', '稿费', '副业收入'] },
  { icon: '📦', name: '其他收入', children: ['其他收入'] }
]

let db: Database.Database

/** 初始化数据库：创建数据文件、建表、写入内置分类（仅首次） */
export function initDatabase(): void {
  // 数据文件位置：Windows 为 %APPDATA%\jizhang\，macOS 为 ~/Library/Application Support/jizhang/
  const dataDir = app.getPath('userData')
  db = new Database(join(dataDir, 'jizhang.db'))
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '',
      is_builtin INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'expense'
    );
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL,
      date TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'expense',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
  `)

  migrateDatabase()
  seedCategories()
}

/** 老库升级：补收支类型列。只加列不删数据；迁移前自动把数据库备份为 jizhang.db.bak */
function migrateDatabase(): void {
  const recordCols = db.pragma('table_info(records)') as { name: string }[]
  const catCols = db.pragma('table_info(categories)') as { name: string }[]
  const need =
    !recordCols.some((c) => c.name === 'type') || !catCols.some((c) => c.name === 'type')
  if (!need) return

  // 先把数据落盘（WAL 模式下最新数据可能在 -wal 文件里），再复制备份
  db.pragma('wal_checkpoint(TRUNCATE)')
  const dbPath = join(app.getPath('userData'), 'jizhang.db')
  if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, dbPath + '.bak')

  if (!recordCols.some((c) => c.name === 'type')) {
    db.exec("ALTER TABLE records ADD COLUMN type TEXT NOT NULL DEFAULT 'expense'")
  }
  if (!catCols.some((c) => c.name === 'type')) {
    db.exec("ALTER TABLE categories ADD COLUMN type TEXT NOT NULL DEFAULT 'expense'")
  }
}

/** 按类型补种内置分类（各类型独立判断：新库全种，老库升级时只补收入分类） */
function seedCategories(): void {
  seedCategorySet(BUILTIN_CATEGORIES, 'expense')
  seedCategorySet(BUILTIN_INCOME_CATEGORIES, 'income')
}

function seedCategorySet(
  cats: { icon: string; name: string; children: string[] }[],
  type: RecordType
): void {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM categories WHERE type = ?').get(type) as {
    c: number
  }
  if (c > 0) return

  const insert = db.prepare(
    'INSERT INTO categories (parent_id, name, icon, is_builtin, sort_order, type) VALUES (?, ?, ?, 1, ?, ?)'
  )
  const tx = db.transaction(() => {
    cats.forEach((cat, i) => {
      const parentId = insert.run(null, cat.name, cat.icon, i, type).lastInsertRowid
      cat.children.forEach((child, j) => {
        insert.run(parentId, child, '', i * 100 + j, type)
      })
    })
  })
  tx()
}

/** 查询全部分类 */
export function listCategories(): Category[] {
  return db
    .prepare(
      'SELECT id, parent_id AS parentId, name, icon, is_builtin AS isBuiltin, sort_order AS sortOrder, type FROM categories ORDER BY sort_order'
    )
    .all() as Category[]
}

/** 新增一笔记录，返回新记录 id */
export function addRecord(data: NewRecord): number {
  if (!Number.isInteger(data.amountCents) || data.amountCents <= 0) {
    throw new Error('金额不合法')
  }
  if (data.type !== 'expense' && data.type !== 'income') {
    throw new Error('记录类型不合法')
  }
  const cat = db.prepare('SELECT type FROM categories WHERE id = ?').get(data.categoryId) as
    | { type: RecordType }
    | undefined
  if (!cat) throw new Error('分类不存在')
  if (cat.type !== data.type) throw new Error('分类与收支类型不匹配')

  const result = db
    .prepare('INSERT INTO records (category_id, amount_cents, date, note, type) VALUES (?, ?, ?, ?, ?)')
    .run(data.categoryId, data.amountCents, data.date, data.note.trim(), data.type)
  return Number(result.lastInsertRowid)
}

/** 查询记录列表（可按月份过滤，默认全部），按日期倒序 */
export function listRecords(filter: { month?: string } = {}): RecordItem[] {
  let sql = `
    SELECT r.id, r.category_id AS categoryId, p.id AS parentId,
           r.amount_cents AS amountCents, r.date, r.note, r.type,
           r.created_at AS createdAt, r.updated_at AS updatedAt,
           c.name AS categoryName, c.icon AS icon,
           p.name AS parentName, p.icon AS parentIcon
    FROM records r
    JOIN categories c ON c.id = r.category_id
    LEFT JOIN categories p ON p.id = c.parent_id
  `
  const params: unknown[] = []
  if (filter.month) {
    sql += ' WHERE r.date LIKE ?'
    params.push(`${filter.month}%`)
  }
  sql += ' ORDER BY r.date DESC, r.id DESC'
  return db.prepare(sql).all(...params) as RecordItem[]
}

/** 修改一笔记录 */
export function updateRecord(id: number, data: Partial<NewRecord>): void {
  const fields: string[] = []
  const params: unknown[] = []
  if (data.amountCents !== undefined) {
    if (!Number.isInteger(data.amountCents) || data.amountCents <= 0) throw new Error('金额不合法')
    fields.push('amount_cents = ?')
    params.push(data.amountCents)
  }
  if (data.categoryId !== undefined) {
    fields.push('category_id = ?')
    params.push(data.categoryId)
  }
  if (data.date !== undefined) {
    fields.push('date = ?')
    params.push(data.date)
  }
  if (data.note !== undefined) {
    fields.push('note = ?')
    params.push(data.note.trim())
  }
  if (data.type !== undefined) {
    if (data.type !== 'expense' && data.type !== 'income') throw new Error('记录类型不合法')
    fields.push('type = ?')
    params.push(data.type)
  }
  if (fields.length === 0) return

  // 类型或分类变化时，校验收支类型与分类匹配（防止支出分类挂在收入记录上）
  if (data.type !== undefined || data.categoryId !== undefined) {
    const cur = db
      .prepare('SELECT category_id AS categoryId, type FROM records WHERE id = ?')
      .get(id) as { categoryId: number; type: RecordType } | undefined
    if (!cur) return
    const cat = db
      .prepare('SELECT type FROM categories WHERE id = ?')
      .get(data.categoryId ?? cur.categoryId) as { type: RecordType } | undefined
    if (!cat) throw new Error('分类不存在')
    if (cat.type !== (data.type ?? cur.type)) throw new Error('分类与收支类型不匹配')
  }

  fields.push("updated_at = datetime('now', 'localtime')")
  params.push(id)
  db.prepare(`UPDATE records SET ${fields.join(', ')} WHERE id = ?`).run(...params)
}

/** 删除一笔记录 */
export function deleteRecord(id: number): void {
  db.prepare('DELETE FROM records WHERE id = ?').run(id)
}

/** 添加自定义二级小类，返回新分类 id */
export function addCategory(parentId: number, name: string): number {
  // 新小类自动继承父级大类的收支类型
  const parent = db
    .prepare('SELECT id, type FROM categories WHERE id = ? AND parent_id IS NULL')
    .get(parentId) as { id: number; type: RecordType } | undefined
  if (!parent) throw new Error('一级大类不存在')

  const trimmed = name.trim()
  if (!trimmed) throw new Error('小类名称不能为空')
  if (trimmed.length > 10) throw new Error('小类名称最多 10 个字')

  const { c } = db
    .prepare('SELECT COUNT(*) AS c FROM categories WHERE parent_id = ? AND name = ?')
    .get(parentId, trimmed) as { c: number }
  if (c > 0) throw new Error('该小类已存在')

  const { m } = db
    .prepare('SELECT MAX(sort_order) AS m FROM categories WHERE parent_id = ?')
    .get(parentId) as { m: number | null }

  const result = db
    .prepare(
      'INSERT INTO categories (parent_id, name, icon, is_builtin, sort_order, type) VALUES (?, ?, ?, 0, ?, ?)'
    )
    .run(parentId, trimmed, '', (m ?? 0) + 1, parent.type)
  return Number(result.lastInsertRowid)
}

/** 删除自定义二级小类（内置分类与已被使用的分类不可删除） */
export function deleteCategory(id: number): void {
  const cat = db
    .prepare('SELECT id, parent_id AS parentId, is_builtin AS isBuiltin FROM categories WHERE id = ?')
    .get(id) as { id: number; parentId: number | null; isBuiltin: number } | undefined
  if (!cat) throw new Error('分类不存在')
  if (cat.isBuiltin) throw new Error('内置分类不可删除')
  if (cat.parentId === null) throw new Error('一级大类不可删除')

  const { c } = db.prepare('SELECT COUNT(*) AS c FROM records WHERE category_id = ?').get(id) as {
    c: number
  }
  if (c > 0) throw new Error('该分类已被使用，不可删除（保护历史数据）')

  db.prepare('DELETE FROM categories WHERE id = ?').run(id)
}
