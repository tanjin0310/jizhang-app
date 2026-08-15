import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from 'antd'

// 游戏参数：20x20 棋盘，每格 22 像素
const GRID = 20
const CELL = 22
const CANVAS_SIZE = GRID * CELL // 440
const TICK_MS = 150 // 每 150 毫秒走一步

type Point = { x: number; y: number }
type Direction = 'up' | 'down' | 'left' | 'right'
type Status = 'idle' | 'running' | 'over' | 'won'

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left'
}

// 初始蛇：3 节，头朝右
const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 }
]

// 按键 → 方向对照表（WASD 用小写，配合 key.toLowerCase()，大小写锁定也不受影响）
const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right'
}

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y
}

// 从空闲格子里随机选一个放食物；棋盘满了返回 null（表示通关）
function randomFood(snake: Point[]): Point | null {
  const free: Point[] = []
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const p = { x, y }
      if (!snake.some((s) => samePoint(s, p))) free.push(p)
    }
  }
  if (free.length === 0) return null
  return free[Math.floor(Math.random() * free.length)]
}

// 在画板上画出一帧画面
function draw(
  ctx: CanvasRenderingContext2D,
  snake: Point[],
  food: Point | null,
  status: Status
): void {
  // 背景
  ctx.fillStyle = '#fafafa'
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  // 棋盘格线
  ctx.strokeStyle = '#f0f0f0'
  ctx.lineWidth = 1
  for (let i = 1; i < GRID; i++) {
    ctx.beginPath()
    ctx.moveTo(i * CELL, 0)
    ctx.lineTo(i * CELL, CANVAS_SIZE)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i * CELL)
    ctx.lineTo(CANVAS_SIZE, i * CELL)
    ctx.stroke()
  }
  // 蛇身（绿色，与收入同色系）
  snake.forEach((seg, i) => {
    ctx.fillStyle = i === 0 ? '#237804' : '#389e0d'
    const pad = 2
    ctx.beginPath()
    ctx.roundRect(seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 4)
    ctx.fill()
  })
  // 食物（红色圆点，与支出同色系）；游戏结束时画成灰色
  if (food) {
    ctx.fillStyle = status === 'over' ? '#bfbfbf' : '#cf1322'
    ctx.beginPath()
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

export default function SnakeGamePage({ paused = false }: { paused?: boolean }): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [score, setScore] = useState(0)
  // 用 ref 保存游戏数据，保证定时器/键盘监听里拿到的永远是最新值
  const snakeRef = useRef<Point[]>(INITIAL_SNAKE)
  const foodRef = useRef<Point | null>({ x: 12, y: 10 })
  const dirRef = useRef<Direction>('right') // 本步要用的方向
  const movedDirRef = useRef<Direction>('right') // 上一步实际走的方向（防止 180 度掉头用它判断）
  const statusRef = useRef<Status>('idle')
  const pausedRef = useRef(false) // 外部暂停（弹窗 / 切页）
  const blurredRef = useRef(false) // 窗口失焦暂停

  // 外部传入暂停状态（打开记一笔弹窗、切到其他页面时 App 会传 true）
  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  // 窗口失焦自动暂停，回到窗口自动继续
  useEffect(() => {
    const onBlur = (): void => {
      blurredRef.current = true
    }
    const onFocus = (): void => {
      blurredRef.current = false
    }
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  // 画一帧
  const paint = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    draw(ctx, snakeRef.current, foodRef.current, statusRef.current)
  }, [])

  // 首次挂载画出初始棋盘
  useEffect(() => {
    paint()
  }, [paint])

  // 游戏结束（撞墙 / 撞自己 / 通关）
  const endGame = useCallback(
    (s: Status): void => {
      statusRef.current = s
      setStatus(s)
      paint()
    },
    [paint]
  )

  // 走一步
  const step = useCallback(() => {
    if (statusRef.current !== 'running' || pausedRef.current || blurredRef.current) return
    const dir = dirRef.current
    movedDirRef.current = dir
    const snake = snakeRef.current
    const head = snake[0]
    const nextHead = { x: head.x, y: head.y }
    if (dir === 'up') nextHead.y -= 1
    if (dir === 'down') nextHead.y += 1
    if (dir === 'left') nextHead.x -= 1
    if (dir === 'right') nextHead.x += 1
    // 撞墙判定
    if (nextHead.x < 0 || nextHead.x >= GRID || nextHead.y < 0 || nextHead.y >= GRID) {
      endGame('over')
      return
    }
    // 撞自己判定（蛇尾这一格即将空出来，不算撞）
    const eatsFood = foodRef.current !== null && samePoint(foodRef.current, nextHead)
    const body = eatsFood ? snake : snake.slice(0, -1)
    if (body.some((s) => samePoint(s, nextHead))) {
      endGame('over')
      return
    }
    snakeRef.current = [nextHead, ...body]
    if (eatsFood) {
      setScore((s) => s + 1)
      const f = randomFood(snakeRef.current)
      if (f === null) {
        // 棋盘占满：通关
        foodRef.current = null
        endGame('won')
        return
      }
      foodRef.current = f
    }
    paint()
  }, [paint, endGame])

  // 开始 / 重新开始（可指定开局方向）
  const start = useCallback(
    (dir: Direction = 'right') => {
      snakeRef.current = INITIAL_SNAKE
      foodRef.current = { x: 12, y: 10 }
      dirRef.current = dir
      movedDirRef.current = dir
      statusRef.current = 'running'
      setScore(0)
      setStatus('running')
      paint()
      // 点按钮后把焦点还给页面，键盘才能控制蛇
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    },
    [paint]
  )

  // 游戏主循环：跑动时每 TICK_MS 走一步
  useEffect(() => {
    if (status !== 'running') return
    const timer = setInterval(step, TICK_MS)
    return () => clearInterval(timer)
  }, [status, step])

  // 键盘控制：方向键 / WASD 转向，空格开始或再来一局
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.repeat) return // 按住按键不连发（防止空格在死亡瞬间立刻重开）
      if (pausedRef.current || blurredRef.current) return
      const target = e.target
      // 不抢输入框、备注框的按键（记一笔弹窗里要正常打字）
      if (target instanceof HTMLElement) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return
        // 左侧菜单自己要用方向键移动选中项，游戏不参与
        if (target.closest('.ant-menu')) return
      }
      const key = e.key.toLowerCase()
      const newDir = KEY_TO_DIR[key]
      const st = statusRef.current
      if (newDir) {
        if (st === 'idle') {
          // 开局：按任意方向键直接朝该方向开始
          e.preventDefault()
          start(newDir)
          return
        }
        if (st !== 'running') return
        // 跑动中：不能 180 度掉头（对照上一步实际走的方向）
        if (newDir !== OPPOSITE[movedDirRef.current]) {
          dirRef.current = newDir
        }
        e.preventDefault()
        return
      }
      if (key === ' ') {
        if (st === 'idle' || st === 'over' || st === 'won') {
          start()
        }
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [start])

  return (
    <div className="snake-page">
      <div className="snake-score">
        当前得分：<span className="snake-score-value">{score}</span>
      </div>
      <div className="snake-board-wrap">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="snake-canvas"
        />
        {status !== 'running' && (
          <div className="snake-overlay">
            <div className="snake-overlay-title">
              {status === 'won'
                ? `恭喜通关！得分 ${score}`
                : status === 'over'
                  ? `游戏结束，得分 ${score}`
                  : '贪吃蛇'}
            </div>
            {status === 'idle' && (
              <div className="snake-overlay-tip">方向键 / WASD 控制移动 · 空格或按方向键开始</div>
            )}
            <Button type="primary" onClick={() => start()}>
              {status === 'idle' ? '开始游戏' : '再来一局'}
            </Button>
          </div>
        )}
      </div>
      <div className="snake-hint">吃红点变长 · 撞墙或撞到自己结束 · 不能 180 度掉头</div>
    </div>
  )
}
