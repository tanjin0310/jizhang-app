import dayjs from 'dayjs'
import type { RecordType } from '../../shared/types'

/** 金额（分）格式化为 ¥ 元，两位小数；收入带 + 号；负数显示 -¥（结余为负时用到） */
export function formatAmount(cents: number, type: RecordType = 'expense'): string {
  if (cents < 0) return '-¥' + (Math.abs(cents) / 100).toFixed(2)
  return (type === 'income' ? '+¥' : '¥') + (cents / 100).toFixed(2)
}

/** 日期分组标题：今天 / 昨天 / M月D日（跨年时带年份） */
export function dayLabel(date: string): string {
  const d = dayjs(date)
  const today = dayjs()
  if (d.isSame(today, 'day')) return '今天'
  if (d.isSame(today.subtract(1, 'day'), 'day')) return '昨天'
  if (d.isSame(today, 'year')) return d.format('M月D日')
  return d.format('YYYY年M月D日')
}

/** 把底层错误信息转成用户能看懂的中文提示（去掉 Electron 调用的技术前缀） */
export function errMsg(error: unknown): string {
  const s = String(error)
  return s.replace(/^Error invoking remote method '[^']+': Error: /, '')
}
