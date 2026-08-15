import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Input, Modal, Popconfirm, Tag, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { api } from '../api'
import type { Category } from '../../../shared/types'
import { errMsg } from '../utils'

export default function SettingsPage(): JSX.Element {
  const [categories, setCategories] = useState<Category[]>([])
  // 正在为其添加小类的一级大类；null 表示弹窗关闭
  const [addParent, setAddParent] = useState<Category | null>(null)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(() => {
    api
      .listCategories()
      .then(setCategories)
      .catch((error) => console.error('读取分类失败', error))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const parents = categories.filter((c) => c.parentId === null)

  const handleAdd = async (): Promise<void> => {
    if (!addParent || !newName.trim()) return
    setAdding(true)
    try {
      await api.addCategory(addParent.id, newName)
      message.success('已添加小类 ✅')
      setNewName('')
      setAddParent(null)
      load()
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: number): Promise<void> => {
    try {
      await api.deleteCategory(id)
      message.success('已删除')
      load()
    } catch (error) {
      message.error(errMsg(error))
    }
  }

  return (
    <div>
      <Card title="分类管理">
        <p style={{ color: '#8c8c8c', marginTop: 0 }}>
          一级大类固定 10 个不可修改；您可以为每个大类添加自定义二级小类。
          内置小类与已被使用的小类不可删除（保护历史数据）。
        </p>
        {parents.map((p) => {
          const children = categories.filter((c) => c.parentId === p.id)
          return (
            <div key={p.id} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>
                  {p.icon} {p.name}
                </span>
                <Button
                  size="small"
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setAddParent(p)
                    setNewName('')
                  }}
                >
                  添加小类
                </Button>
              </div>
              <div>
                {children.map((c) =>
                  c.isBuiltin ? (
                    <Tag key={c.id}>{c.name}</Tag>
                  ) : (
                    <Popconfirm
                      key={c.id}
                      title={`删除「${c.name}」小类？`}
                      okText="删除"
                      okButtonProps={{ danger: true }}
                      cancelText="取消"
                      onConfirm={() => handleDelete(c.id)}
                    >
                      <Tag
                        closable
                        color="blue"
                        onClose={(e) => {
                          // 关闭动作交给 Popconfirm 的确认流程处理
                          e.preventDefault()
                        }}
                      >
                        {c.name}
                      </Tag>
                    </Popconfirm>
                  )
                )}
              </div>
            </div>
          )
        })}
      </Card>

      <Modal
        title={`给「${addParent?.name ?? ''}」添加小类`}
        open={!!addParent}
        onCancel={() => setAddParent(null)}
        onOk={handleAdd}
        okText="添加"
        cancelText="取消"
        confirmLoading={adding}
        okButtonProps={{ disabled: !newName.trim() }}
      >
        <Input
          placeholder="小类名称，最多 10 个字，例如：宠物"
          value={newName}
          maxLength={10}
          autoFocus
          onChange={(e) => setNewName(e.target.value)}
          onPressEnter={handleAdd}
        />
      </Modal>
    </div>
  )
}
