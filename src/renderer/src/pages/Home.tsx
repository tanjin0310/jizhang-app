import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, Empty, Row } from 'antd'
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '../api'
import type { RecordItem } from '../../../shared/types'
import { formatAmount } from '../utils'

interface Props {
  refreshKey: number
}

export default function HomePage({ refreshKey }: Props): JSX.Element {
  const [month, setMonth] = useState(dayjs())
  const [records, setRecords] = useState<RecordItem[]>([])

  useEffect(() => {
    let cancelled = false
    api
      .listRecords()
      .then((data) => {
        if (!cancelled) setRecords(data)
      })
      .catch((error) => console.error('读取流水失败', error))
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const monthKey = month.format('YYYY-MM')
  const monthRecords = useMemo(
    () => records.filter((r) => r.date.startsWith(monthKey)),
    [records, monthKey]
  )

  // 本月收支分类型统计
  const monthExpenseCents = monthRecords
    .filter((r) => r.type !== 'income')
    .reduce((sum, r) => sum + r.amountCents, 0)
  const monthIncomeCents = monthRecords
    .filter((r) => r.type === 'income')
    .reduce((sum, r) => sum + r.amountCents, 0)
  // 结余 = 收入 − 支出（负数表示本月超支）
  const balanceCents = monthIncomeCents - monthExpenseCents
  const count = monthRecords.length
  const isCurrentMonth = monthKey === dayjs().format('YYYY-MM')
  // 日均支出 = 本月支出 ÷ 本月已过天数（查看历史月份时按当月总天数）
  const daysPassed = isCurrentMonth ? dayjs().date() : month.daysInMonth()
  const dailyAvgCents = daysPassed > 0 ? monthExpenseCents / daysPassed : 0

  const todayKey = dayjs().format('YYYY-MM-DD')
  const todayExpenseCents = useMemo(
    () =>
      records
        .filter((r) => r.date === todayKey && r.type !== 'income')
        .reduce((sum, r) => sum + r.amountCents, 0),
    [records, todayKey]
  )
  const todayIncomeCents = useMemo(
    () =>
      records
        .filter((r) => r.date === todayKey && r.type === 'income')
        .reduce((sum, r) => sum + r.amountCents, 0),
    [records, todayKey]
  )

  // 记录已按日期倒序，直接取前 5 笔
  const recent = monthRecords.slice(0, 5)

  return (
    <div>
      {/* 月份切换 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => setMonth((m) => m.subtract(1, 'month'))} />
        <span style={{ fontSize: 18, fontWeight: 600, minWidth: 130, textAlign: 'center' }}>
          {month.format('YYYY年M月')}
        </span>
        <Button icon={<ArrowRightOutlined />} onClick={() => setMonth((m) => m.add(1, 'month'))} />
        {!isCurrentMonth && (
          <Button type="link" onClick={() => setMonth(dayjs())}>
            回到本月
          </Button>
        )}
      </div>

      {/* 概览卡片：支出 / 收入 / 结余 / 今日收支 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <div className="stat-label">本月支出</div>
            <div className="stat-value amount">{formatAmount(monthExpenseCents)}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div className="stat-label">本月收入</div>
            <div className="stat-value amount income">{formatAmount(monthIncomeCents, 'income')}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div className="stat-label">本月结余</div>
            <div className={balanceCents >= 0 ? 'stat-value amount income' : 'stat-value amount'}>
              {formatAmount(balanceCents, balanceCents >= 0 ? 'income' : 'expense')}
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div className="stat-label">今日收支</div>
            <div className="today-breakdown">
              <div className="today-line">
                支出 <span className="amount">{formatAmount(todayExpenseCents)}</span>
              </div>
              <div className="today-line">
                收入 <span className="amount income">{formatAmount(todayIncomeCents, 'income')}</span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 最近流水（标题右侧附笔数与日均支出） */}
      <Card
        title={`${month.format('M月')}最近流水`}
        extra={
          <span style={{ color: '#8c8c8c', fontSize: 13 }}>
            共 {count} 笔 · 日均支出 {formatAmount(Math.round(dailyAvgCents))}
          </span>
        }
        style={{ marginTop: 16 }}
      >
        {recent.length === 0 ? (
          <Empty description="本月还没有记录，点击右上角「记一笔」开始吧" />
        ) : (
          recent.map((r) => (
            <div key={r.id} className="home-record-row">
              <span className="record-cat">
                {r.parentIcon} {r.parentName} / {r.categoryName}
              </span>
              <span className="record-note">{r.note}</span>
              <span style={{ color: '#999', fontSize: 13 }}>{dayjs(r.date).format('M月D日')}</span>
              <span className={r.type === 'income' ? 'amount income' : 'amount'}>
                {formatAmount(r.amountCents, r.type)}
              </span>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
