import { useCallback, useEffect, useState } from 'react'
import { Button, Layout, Menu } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import TransactionsPage from './pages/Transactions'
import HomePage from './pages/Home'
import StatsPage from './pages/Stats'
import SettingsPage from './pages/Settings'
import SnakeGamePage from './pages/SnakeGame'
import AddRecordModal from './components/AddRecordModal'
import type { RecordItem } from '../../shared/types'

const { Sider, Header, Content } = Layout

const PAGE_TITLES: Record<string, string> = {
  home: '首页',
  transactions: '流水',
  stats: '统计',
  game: '游戏',
  settings: '设置'
}

export default function App(): JSX.Element {
  const [page, setPage] = useState('transactions')
  const [modalOpen, setModalOpen] = useState(false)
  // 正在编辑的记录；为 null 表示「记一笔」新增模式
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null)
  // 每记一笔成功后 +1，各页面据此自动刷新
  const [refreshKey, setRefreshKey] = useState(0)

  // 快捷键 Ctrl+N（macOS 为 Cmd+N）打开「记一笔」
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setModalOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleSaved = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  // 打开「记一笔」（新增）或「编辑记录」弹窗
  const openAddModal = useCallback(() => {
    setEditingRecord(null)
    setModalOpen(true)
  }, [])

  const openEditModal = useCallback((record: RecordItem) => {
    setEditingRecord(record)
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingRecord(null)
  }, [])

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider theme="light" width={180}>
        <div className="logo">💰 记账</div>
        <Menu
          mode="inline"
          selectedKeys={[page]}
          onClick={({ key }) => setPage(key)}
          items={[
            { key: 'home', label: '首页' },
            { key: 'transactions', label: '流水' },
            { key: 'stats', label: '统计' },
            { key: 'game', label: '🎮 游戏' },
            { key: 'settings', label: '设置' }
          ]}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 24px',
            borderBottom: '1px solid #f0f0f0'
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600 }}>{PAGE_TITLES[page]}</div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            记一笔
          </Button>
        </Header>
        <Content style={{ padding: 24, overflow: 'auto' }}>
          {page === 'home' && <HomePage refreshKey={refreshKey} />}
          {page === 'transactions' && (
            <TransactionsPage refreshKey={refreshKey} onEdit={openEditModal} onChanged={handleSaved} />
          )}
          {page === 'stats' && <StatsPage refreshKey={refreshKey} />}
          {page === 'game' && <SnakeGamePage />}
          {page === 'settings' && <SettingsPage />}
        </Content>
      </Layout>
      <AddRecordModal open={modalOpen} onClose={closeModal} onSaved={handleSaved} record={editingRecord} />
    </Layout>
  )
}
