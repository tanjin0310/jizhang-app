// 生成应用图标 build/icon.png（512x512：品牌红圆角方块 + 白色 ¥ 符号）
// 纯 Node 实现（zlib 为内置模块），不依赖任何第三方库
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const SIZE = 512
const BG = [207, 19, 34] // 品牌红 #cf1322
const FG = [255, 255, 255] // 白色 ¥

// ---- CRC32（PNG 分块校验） ----
const crcTable = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c
}
function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

// ---- 几何工具 ----
/** 点到线段的距离 */
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const l2 = dx * dx + dy * dy
  let t = l2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / l2
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * dx
  const cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}
/** 圆角矩形有向距离（内部为负） */
function sdfRoundedRect(px, py, x, y, w, h, r) {
  const qx = Math.abs(px - (x + w / 2)) - (w / 2 - r)
  const qy = Math.abs(py - (y + h / 2)) - (h / 2 - r)
  const ox = Math.max(qx, 0)
  const oy = Math.max(qy, 0)
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r
}

// ---- ¥ 字笔画（线段集合：竖 + 两斜 + 两横） ----
const STROKE = 34
const strokes = [
  [256, 130, 256, 388], // 竖
  [256, 128, 138, 252], // 左斜
  [256, 128, 374, 252], // 右斜
  [138, 232, 374, 232], // 上横
  [138, 312, 374, 312] // 下横
]

// ---- 逐像素绘制（带抗锯齿） ----
const pixels = Buffer.alloc(SIZE * SIZE * 4)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const px = x + 0.5
    const py = y + 0.5
    // 背景：圆角方块，按有向距离抗锯齿
    const d = sdfRoundedRect(px, py, 16, 16, 480, 480, 96)
    const a = Math.max(0, Math.min(1, 0.5 - d))
    if (a > 0) {
      let r = BG[0]
      let g = BG[1]
      let b = BG[2]
      // 前景：¥ 笔画，按最近距离计算白色覆盖度
      let minD = Infinity
      for (const s of strokes) minD = Math.min(minD, distToSeg(px, py, s[0], s[1], s[2], s[3]))
      const fa = Math.max(0, Math.min(1, STROKE / 2 + 0.5 - minD))
      if (fa > 0) {
        r += (FG[0] - r) * fa
        g += (FG[1] - g) * fa
        b += (FG[2] - b) * fa
      }
      const i = (y * SIZE + x) * 4
      pixels[i] = Math.round(r)
      pixels[i + 1] = Math.round(g)
      pixels[i + 2] = Math.round(b)
      pixels[i + 3] = Math.round(a * 255)
    }
  }
}

// ---- 组装 PNG 文件 ----
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0) // 宽
ihdr.writeUInt32BE(SIZE, 4) // 高
ihdr[8] = 8 // 位深
ihdr[9] = 6 // 颜色类型 RGBA

const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE)
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0 // 扫描线过滤器：无
  pixels.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4)
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
])

const outDir = path.join(__dirname, '..', 'build')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'icon.png'), png)
console.log('icon.png 生成完成:', png.length, '字节')
