import { useEffect, useState } from 'react'
import { Button, Cascader, DatePicker, Form, Input, InputNumber, Modal, message } from 'antd'
import dayjs from 'dayjs'
import { api } from '../api'
import type { Category, RecordItem } from '../../../shared/types'
import { errMsg } from '../utils'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  /** 传入记录则为「编辑」模式，为空则为「记一笔」模式 */
  record: RecordItem | null
}

interface CascaderOption {
  id: number
  name: string
  children?: CascaderOption[]
}

/** 把平铺的分类列表组装成级联选择器需要的树形结构 */
function buildCategoryTree(categories: Category[]): CascaderOption[] {
  return categories
    .filter((c) => c.parentId === null)
    .map((parent) => ({
      id: parent.id,
      name: `${parent.icon} ${parent.name}`,
      children: categories
        .filter((c) => c.parentId === parent.id)
        .map((child) => ({ id: child.id, name: child.name }))
    }))
}

interface FormValues {
  amount: number
  categoryId: number[]
  date: dayjs.Dayjs
  note?: string
}

export default function AddRecordModal({ open, onClose, onSaved, record }: Props): JSX.Element {
  const [form] = Form.useForm()
  const [categories, setCategories] = useState<CascaderOption[]>([])
  const [saving, setSaving] = useState(false)

  // 打开弹窗时：加载分类，并根据「新增/编辑」模式初始化表单
  useEffect(() => {
    if (!open) return
    api
      .listCategories()
      .then((data) => {
        setCategories(buildCategoryTree(data))
        if (record) {
          // 编辑模式：回填原记录内容
          const cat = data.find((c) => c.id === record.categoryId)
          form.setFieldsValue({
            amount: record.amountCents / 100,
            categoryId: cat ? [cat.parentId as number, cat.id] : undefined,
            date: dayjs(record.date),
            note: record.note || undefined
          })
        } else {
          // 新增模式：清空表单，日期默认今天
          form.setFieldsValue({ amount: undefined, categoryId: undefined, note: undefined, date: dayjs() })
        }
      })
      .catch((error) => {
        console.error('读取分类失败', error)
        message.error('读取分类失败')
      })
  }, [open, record, form])

  const handleFinish = async (values: FormValues): Promise<void> => {
    setSaving(true)
    try {
      const data = {
        // 金额按「分」存储，避免小数误差
        amountCents: Math.round(values.amount * 100),
        categoryId: values.categoryId[values.categoryId.length - 1],
        date: values.date.format('YYYY-MM-DD'),
        note: values.note ?? ''
      }
      if (record) {
        await api.updateRecord(record.id, data)
        message.success('已修改 ✅')
        onSaved()
        onClose()
      } else {
        await api.addRecord(data)
        message.success('已保存 ✅')
        // 保留分类和日期，清空金额与备注，方便连续记账
        form.setFieldsValue({ amount: undefined, note: undefined })
        onSaved()
      }
    } catch (error) {
      message.error('保存失败：' + errMsg(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={record ? '编辑记录' : '记一笔'} open={open} onCancel={onClose} footer={null} width={420}>
      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
        <Form.Item
          label="金额（元）"
          name="amount"
          rules={[{ required: true, message: '请输入金额' }]}
        >
          <InputNumber
            prefix="¥"
            min={0.01}
            max={99999999}
            precision={2}
            placeholder="0.00"
            style={{ width: '100%' }}
            autoFocus
          />
        </Form.Item>
        <Form.Item
          label="分类"
          name="categoryId"
          rules={[{ required: true, message: '请选择分类' }]}
        >
          <Cascader
            options={categories}
            fieldNames={{ label: 'name', value: 'id' }}
            placeholder="请选择分类（先选大类，再选小类）"
          />
        </Form.Item>
        <Form.Item label="日期" name="date" rules={[{ required: true, message: '请选择日期' }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="备注（可选）" name="note">
          <Input.TextArea rows={2} maxLength={100} showCount placeholder="最多 100 字" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={saving}>
          {record ? '保存修改' : '保存'}
        </Button>
      </Form>
    </Modal>
  )
}
