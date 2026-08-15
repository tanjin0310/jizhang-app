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

  const totalCents = monthRecords.reduce((sum, r) => sum + r.amountCents, 0)
  const count = monthRecords.length
  const isCurrentMonth = monthKey === dayjs().format('YYYY-MM')
  // 日均 = 本月支出 ÷ 本月已过天数（查看历史月份时按当月总天数）
  const daysPassed = isCurrentMonth ? dayjs().date() : month.daysInMonth()
  const dailyAvgCents = daysPassed > 0 ? totalCents / daysPassed : 0

  const todayKey = dayjs().format('YYYY-MM-DD')
  const todayCents = useMemo(
    () => records.filter((r) => r.date === todayKey).reduce((sum, r) => sum + r.amountCents, 0),
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

      {/* 概览卡片 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <div className="stat-label">本月支出</div>
            <div className="stat-value amount">{formatAmount(totalCents)}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div className="stat-label">本月日均</div>
            <div className="stat-value amount">{formatAmount(Math.round(dailyAvgCents))}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div className="stat-label">本月笔数</div>
            <div className="stat-value">{count} 笔</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div className="stat-label">今日支出</div>
            <div className="stat-value amount">{formatAmount(todayCents)}</div>
          </Card>
        </Col>
      </Row>

      {/* 最近流水 */}
      <Card title={`${month.format('M月')}最近流水`} style={{ marginTop: 16 }}>
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
              <span className="amount">{formatAmount(r.amountCents)}</span>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
