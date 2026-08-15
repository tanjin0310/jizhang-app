import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from 'antd'

// 游戏参数：20x20 棋盘，每格 22 像素
const GRID = 20
const CELL = 22
const CANVAS_SIZE = GRID * CELL // 440
const TICK_MS = 150 // 每 150 毫秒走一步

type Point = { x: number; y: number }
type Direction = 'up' | 'down' | 'left' | 'right'
type Status = 'idle' | 'running' | 'over'

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

// 随机生成一个不在蛇身上的食物
function randomFood(snake: Point[]): Point {
  while (true) {
    const p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p
  }
}

// 在画板上画出一帧画面
function draw(
  ctx: CanvasRenderingContext2D,
  snake: Point[],
  food: Point,
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
  ctx.fillStyle = status === 'over' ? '#bfbfbf' : '#cf1322'
  ctx.beginPath()
  ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2)
  ctx.fill()
}

export default function SnakeGamePage(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [score, setScore] = useState(0)
  // 每走一步 +1，用来触发重画
  const [frame, setFrame] = useState(0)
  // 用 ref 保存游戏数据，避免定时器里拿到旧值
  const snakeRef = useRef<Point[]>(INITIAL_SNAKE)
  const foodRef = useRef<Point>(randomFood(INITIAL_SNAKE))
  const dirRef = useRef<Direction>('right')
  const statusRef = useRef<Status>('idle')

  // 画一帧（任何状态变化后重画）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    draw(ctx, snakeRef.current, foodRef.current, statusRef.current)
  }, [frame, status, score])

  // 走一步
  const step = useCallback(() => {
    const dir = dirRef.current
    const snake = snakeRef.current
    const head = snake[0]
    const nextHead = { x: head.x, y: head.y }
    if (dir === 'up') nextHead.y -= 1
    if (dir === 'down') nextHead.y += 1
    if (dir === 'left') nextHead.x -= 1
    if (dir === 'right') nextHead.x += 1
    // 撞墙判定
    if (nextHead.x < 0 || nextHead.x >= GRID || nextHead.y < 0 || nextHead.y >= GRID) {
      statusRef.current = 'over'
      setStatus('over')
      return
    }
    // 撞自己判定（蛇尾这一格即将空出来，不算撞）
    const eatsFood = foodRef.current.x === nextHead.x && foodRef.current.y === nextHead.y
    const body = eatsFood ? snake : snake.slice(0, -1)
    if (body.some((s) => s.x === nextHead.x && s.y === nextHead.y)) {
      statusRef.current = 'over'
      setStatus('over')
      return
    }
    snakeRef.current = [nextHead, ...body]
    if (eatsFood) {
      setScore((s) => s + 1)
      foodRef.current = randomFood(snakeRef.current)
    }
    setFrame((f) => f + 1) // 步进后画面必须更新
  }, [])

  // 开始 / 重新开始
  const start = useCallback(() => {
    snakeRef.current = INITIAL_SNAKE
    foodRef.current = randomFood(INITIAL_SNAKE)
    dirRef.current = 'right'
    statusRef.current = 'running'
    setScore(0)
    setStatus('running')
  }, [])

  // 游戏主循环：跑动时每 TICK_MS 走一步
  useEffect(() => {
    if (status !== 'running') return
    const timer = setInterval(step, TICK_MS)
    return () => clearInterval(timer)
  }, [status, step])

  // 键盘控制：方向键 / WASD 转向，空格开始或再来一局
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const key = e.key
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) {
        e.preventDefault() // 防止方向键滚动页面
      }
      const keyMap: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right'
      }
      const newDir = keyMap[key]
      if (newDir) {
        // 不能 180 度掉头
        if (newDir !== OPPOSITE[dirRef.current]) {
          dirRef.current = newDir
          // 空闲状态下按方向键直接开始
          if (statusRef.current === 'idle') {
            statusRef.current = 'running'
            setStatus('running')
          }
        }
      }
      if (key === ' ') {
        if (statusRef.current === 'idle' || statusRef.current === 'over') {
          start()
        }
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
              {status === 'over' ? `游戏结束，得分 ${score}` : '贪吃蛇'}
            </div>
            {status === 'idle' && (
              <div className="snake-overlay-tip">方向键 / WASD 控制移动 · 空格开始</div>
            )}
            <Button type="primary" onClick={start}>
              {status === 'over' ? '再来一局' : '开始游戏'}
            </Button>
          </div>
        )}
      </div>
      <div className="snake-hint">吃红点变长 · 撞墙或撞到自己结束 · 不能 180 度掉头</div>
    </div>
  )
}
