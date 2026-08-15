import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Empty, Input, Popconfirm, Select, message } from 'antd'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { api } from '../api'
import type { Category, RecordItem } from '../../../shared/types'
import { dayLabel, errMsg, formatAmount } from '../utils'

interface Props {
  refreshKey: number
  onEdit: (record: RecordItem) => void
  onChanged: () => void
}

interface DateGroup {
  date: string
  label: string
  items: RecordItem[]
  expenseTotal: number
  incomeTotal: number
}

export default function TransactionsPage({ refreshKey, onEdit, onChanged }: Props): JSX.Element {
  const [records, setRecords] = useState<RecordItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [keyword, setKeyword] = useState('')
  const [parentId, setParentId] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([api.listRecords(), api.listCategories()])
      .then(([recordData, categoryData]) => {
        if (cancelled) return
        setRecords(recordData)
        setCategories(categoryData)
      })
      .catch((error) => console.error('读取流水失败', error))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  // 按备注关键词 + 一级大类筛选（数据在本地，秒出结果）
  const filtered = useMemo(() => {
    let list = records
    const kw = keyword.trim().toLowerCase()
    if (kw) list = list.filter((r) => r.note.toLowerCase().includes(kw))
    if (parentId !== undefined) list = list.filter((r) => r.parentId === parentId)
    return list
  }, [records, keyword, parentId])

  // 按天分组（记录已按日期倒序，直接顺序分组即可）
  const groups = useMemo<DateGroup[]>(() => {
    const map = new Map<string, RecordItem[]>()
    for (const r of filtered) {
      const arr = map.get(r.date) ?? []
      arr.push(r)
      map.set(r.date, arr)
    }
    return Array.from(map.entries()).map(([date, items]) => {
      let expenseTotal = 0
      let incomeTotal = 0
      for (const r of items) {
        if (r.type === 'income') incomeTotal += r.amountCents
        else expenseTotal += r.amountCents
      }
      return { date, label: dayLabel(date), items, expenseTotal, incomeTotal }
    })
  }, [filtered])

  const handleDelete = async (id: number): Promise<void> => {
    try {
      await api.deleteRecord(id)
      message.success('已删除')
      onChanged()
    } catch (error) {
      message.error('删除失败：' + errMsg(error))
    }
  }

  const parentOptions = useMemo(
    () =>
      categories
        .filter((c) => c.parentId === null)
        .map((c) => ({ label: `${c.icon} ${c.name}`, value: c.id })),
    [categories]
  )

  return (
    <Card title="流水">
      {/* 工具栏：搜索 + 分类筛选 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索备注关键词"
          allowClear
          style={{ maxWidth: 280 }}
          onSearch={(v) => setKeyword(v)}
          onChange={(e) => {
            if (!e.target.value) setKeyword('')
          }}
        />
        <Select
          placeholder="按一级分类筛选"
          allowClear
          options={parentOptions}
          value={parentId}
          onChange={(v) => setParentId(v)}
          style={{ width: 180 }}
        />
      </div>

      {loading ? (
        <Empty description="加载中…" />
      ) : groups.length === 0 ? (
        <Empty description="没有符合条件的记录" style={{ padding: '48px 0' }} />
      ) : (
        groups.map((g) => (
          <div key={g.date}>
            {/* 分组头：日期 + 笔数 + 当日小计（收支分开展示，为 0 的不显示） */}
            <div className="group-header">
              <span>
                {g.label} · 共 {g.items.length} 笔
              </span>
              <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {g.expenseTotal > 0 && (
                  <span>
                    支出 <span className="amount">{formatAmount(g.expenseTotal)}</span>
                  </span>
                )}
                {g.incomeTotal > 0 && (
                  <span>
                    收入 <span className="amount income">{formatAmount(g.incomeTotal, 'income')}</span>
                  </span>
                )}
              </span>
            </div>
            {g.items.map((r) => (
              <div key={r.id} className="record-row">
                <span className="record-cat">
                  {r.parentIcon} {r.parentName} / {r.categoryName}
                </span>
                <span className="record-note">{r.note}</span>
                <span className={r.type === 'income' ? 'amount income' : 'amount'}>
                  {formatAmount(r.amountCents, r.type)}
                </span>
                <Button
                  size="small"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(r)}
                />
                <Popconfirm
                  title="确定删除这笔记录吗？"
                  description="删除后无法恢复"
                  okText="删除"
                  okButtonProps={{ danger: true }}
                  cancelText="取消"
                  onConfirm={() => handleDelete(r.id)}
                >
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
            ))}
          </div>
        ))
      )}
    </Card>
  )
}
