import { describe, it, expect } from 'vitest'
import dayjs from 'dayjs'
import { formatAmount, dayLabel, errMsg } from './utils'

describe('金额格式化 formatAmount', () => {
  it('支出 1234 分显示 ¥12.34', () => {
    expect(formatAmount(1234, 'expense')).toBe('¥12.34')
  })
  it('收入 500 分显示 +¥5.00', () => {
    expect(formatAmount(500, 'income')).toBe('+¥5.00')
  })
  it('不传类型时按支出处理', () => {
    expect(formatAmount(100)).toBe('¥1.00')
  })
  it('0 元显示 ¥0.00（收入 0 元带 + 号）', () => {
    expect(formatAmount(0)).toBe('¥0.00')
    expect(formatAmount(0, 'income')).toBe('+¥0.00')
  })
  it('1 分显示 ¥0.01（最小金额不丢零）', () => {
    expect(formatAmount(1)).toBe('¥0.01')
  })
  it('整元自动补两位小数', () => {
    expect(formatAmount(10000)).toBe('¥100.00')
  })
  it('负数显示 -¥（结余为负时，收入类型也按负数显示）', () => {
    expect(formatAmount(-100)).toBe('-¥1.00')
    expect(formatAmount(-100, 'income')).toBe('-¥1.00')
  })
  it('大额金额正常显示', () => {
    expect(formatAmount(123456789)).toBe('¥1234567.89')
  })
})

describe('日期分组标题 dayLabel', () => {
  it('今天的日期显示「今天」', () => {
    expect(dayLabel(dayjs().format('YYYY-MM-DD'))).toBe('今天')
  })
  it('昨天的日期显示「昨天」', () => {
    expect(dayLabel(dayjs().subtract(1, 'day').format('YYYY-MM-DD'))).toBe('昨天')
  })
  it('今年其他日期显示 M月D日', () => {
    const d = dayjs().subtract(2, 'day')
    // 今天恰好是 1 月 1 日/2 日时，「前两天」会跨年，这条检查自动跳过
    if (d.year() !== dayjs().year()) return
    expect(dayLabel(d.format('YYYY-MM-DD'))).toBe(d.format('M月D日'))
  })
  it('跨年日期显示 带年份的 YYYY年M月D日', () => {
    expect(dayLabel('2000-01-15')).toBe('2000年1月15日')
  })
})

describe('错误信息转中文 errMsg', () => {
  it('去掉 Electron 远程调用的技术前缀，只留中文提示', () => {
    expect(errMsg("Error invoking remote method 'addRecord': Error: 分类已被使用")).toBe('分类已被使用')
  })
  it('普通错误信息原样保留', () => {
    expect(errMsg('数据库连接失败')).toBe('数据库连接失败')
  })
  it('不是错误对象（如数字）也能转成文字', () => {
    expect(errMsg(123)).toBe('123')
  })
  it('只去掉开头的技术前缀，中间出现的不动', () => {
    expect(errMsg("操作失败：Error invoking remote method 'x': Error: 详情")).toBe(
      "操作失败：Error invoking remote method 'x': Error: 详情"
    )
  })
})
