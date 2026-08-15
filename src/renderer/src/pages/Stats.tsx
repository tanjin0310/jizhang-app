import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, Empty, Row, Segmented } from 'antd'
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { EChartsCoreOption } from 'echarts/core'
import { api } from '../api'
import type { Category, RecordItem, RecordType } from '../../../shared/types'
import { formatAmount } from '../utils'
import Chart from '../components/Chart'

// 分类色板（dataviz 规范，浅色表面已通过验证）：颜色固定跟随分类，不随排名变化
const PIE_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']
// 第 9 个起的一级大类并入「其他」切片，用中性灰
const OTHER_COLOR = '#b0afa9'
// 柱状图颜色：支出品牌红、收入深绿（收支图表不同时出现）
const BAR_COLOR = '#cf1322'
const BAR_COLOR_INCOME = '#389e0d'
const INK_SECONDARY = '#52514e'
const INK_MUTED = '#898781'
const CHART_FONT = '-apple-system, "Segoe UI", "Microsoft YaHei", sans-serif'

interface Props {
  refreshKey: number
}

interface ParentStat {
  parentId: number
  name: string
  icon: string
  cents: number
  /** 固定色板下标；-1 表示并入「其他」 */
  slot: number
}

export default function StatsPage({ refreshKey }: Props): JSX.Element {
  const [month, setMonth] = useState(dayjs())
  // 当前统计的收支类型
  const [type, setType] = useState<RecordType>('expense')
  const [records, setRecords] = useState<RecordItem[]>([])
  const [parents, setParents] = useState<Category[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([api.listRecords(), api.listCategories()])
      .then(([recordData, categoryData]) => {
        if (cancelled) return
        setRecords(recordData)
        setParents(categoryData.filter((c) => c.parentId === null && c.type === type))
      })
      .catch((error) => console.error('读取统计数据失败', error))
    return () => {
      cancelled = true
    }
  }, [refreshKey, type])

  const monthKey = month.format('YYYY-MM')
  const monthRecords = useMemo(
    () => records.filter((r) => r.date.startsWith(monthKey) && r.type === type),
    [records, monthKey, type]
  )

  // 一级分类汇总：色板按内置分类顺序固定分配（第 9 个起 slot=-1 并入「其他」）
  const parentStats = useMemo<ParentStat[]>(() => {
    const totals = new Map<number, number>()
    for (const r of monthRecords) {
      totals.set(r.parentId, (totals.get(r.parentId) ?? 0) + r.amountCents)
    }
    return parents
      .filter((p) => totals.has(p.id))
      .map((p, index) => ({
        parentId: p.id,
        name: p.name,
        icon: p.icon,
        cents: totals.get(p.id) ?? 0,
        slot: index < PIE_COLORS.length ? index : -1
      }))
      .sort((a, b) => b.cents - a.cents)
  }, [parents, monthRecords])

  const totalCents = parentStats.reduce((s, p) => s + p.cents, 0)

  // 饼图数据：slot ≥ 0 的分类单独成片，其余合并为「其他」
  const pieData = useMemo(() => {
    const slices = parentStats
      .filter((p) => p.slot >= 0)
      .map((p) => ({
        name: p.name,
        value: p.cents,
        itemStyle: { color: PIE_COLORS[p.slot] }
      }))
    const restCents = parentStats.filter((p) => p.slot < 0).reduce((s, p) => s + p.cents, 0)
    if (restCents > 0) {
      slices.push({ name: '其他', value: restCents, itemStyle: { color: OTHER_COLOR } })
    }
    return slices
  }, [parentStats])

  const pieOption = useMemo<EChartsCoreOption>(
    () => ({
      textStyle: { fontFamily: CHART_FONT },
      tooltip: {
        trigger: 'item',
        valueFormatter: (v: unknown) => formatAmount(v as number)
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: INK_SECONDARY, fontFamily: CHART_FONT }
      },
      series: [
        {
          type: 'pie',
          radius: ['42%', '66%'],
          center: ['50%', '44%'],
          // 太小的切片不显示文字标签（图例已承载身份信息）
          minShowLabelAngle: 8,
          itemStyle: { borderColor: '#ffffff', borderWidth: 2, borderRadius: 4 },
          label: {
            color: INK_SECONDARY,
            fontFamily: CHART_FONT,
            fontSize: 12,
            formatter: '{b} {d}%'
          },
          labelLine: { length: 10, length2: 6, lineStyle: { color: '#c3c2b7' } },
          data: pieData
        }
      ]
    }),
    [pieData]
  )

  // 每日支出柱状图：当月每一天
  const barOption = useMemo<EChartsCoreOption>(() => {
    const daysInMonth = month.daysInMonth()
    const daily = new Map<number, number>()
    for (const r of monthRecords) {
      const d = Number(r.date.slice(8, 10))
      daily.set(d, (daily.get(d) ?? 0) + r.amountCents)
    }
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    const values = days.map((d) => daily.get(d) ?? 0)
    return {
      textStyle: { fontFamily: CHART_FONT },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v: unknown) => formatAmount(v as number)
      },
      grid: { left: 8, right: 8, top: 16, bottom: 0, containLabel: true },
      xAxis: {
        type: 'category',
        data: days.map((d) => String(d)),
        axisTick: { alignWithLabel: true },
        axisLine: { lineStyle: { color: '#c3c2b7' } },
        axisLabel: { color: INK_MUTED, interval: 4, fontFamily: CHART_FONT }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#e1e0d9' } },
        axisLabel: {
          color: INK_MUTED,
          fontFamily: CHART_FONT,
          formatter: (v: number) => '¥' + v / 100
        }
      },
      series: [
        {
          type: 'bar',
          data: values,
          barMaxWidth: 22,
          itemStyle: { color: type === 'income' ? BAR_COLOR_INCOME : BAR_COLOR, borderRadius: [4, 4, 0, 0] }
        }
      ]
    }
  }, [monthRecords, month, type])

  const isCurrentMonth = monthKey === dayjs().format('YYYY-MM')

  return (
    <div>
      {/* 收支切换 + 月份切换 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <Segmented
          value={type}
          onChange={(v) => setType(v as RecordType)}
          options={[
            { label: '支出', value: 'expense' },
            { label: '收入', value: 'income' }
          ]}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
      </div>

      {monthRecords.length === 0 ? (
        <Card>
          <Empty
            description={`本月还没有${type === 'income' ? '收入' : '支出'}记录`}
            style={{ padding: '48px 0' }}
          />
        </Card>
      ) : (
        <>
          <Row gutter={16}>
            <Col span={12}>
              <Card title="分类占比">
                <Chart option={pieOption} height={340} />
              </Card>
            </Col>
            <Col span={12}>
              <Card title={type === 'income' ? '每日收入' : '每日支出'}>
                <Chart option={barOption} height={340} />
              </Card>
            </Col>
          </Row>
          <Card title="分类排行" style={{ marginTop: 16 }}>
            {parentStats.map((p, i) => {
              const pct = totalCents > 0 ? (p.cents / totalCents) * 100 : 0
              const color = p.slot >= 0 ? PIE_COLORS[p.slot] : OTHER_COLOR
              return (
                <div key={p.parentId} className="rank-row">
                  <span className="rank-no">{i + 1}</span>
                  <span className="rank-name">
                    {p.icon} {p.name}
                  </span>
                  <div className="rank-track">
                    <div className="rank-bar" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="rank-pct">{pct.toFixed(1)}%</span>
                  <span className="amount">{formatAmount(p.cents)}</span>
                </div>
              )
            })}
          </Card>
        </>
      )}
    </div>
  )
}
