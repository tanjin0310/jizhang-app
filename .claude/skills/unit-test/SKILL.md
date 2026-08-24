---
name: unit-test
description: 当用户要求「写单元测试」「给代码做测试」「测试一下」「跑测试」「执行测试」「生成测试报告」时使用。用于给《记账》项目创建单元测试、执行测试并汇报测试报告。
---

# 记账项目单元测试（Vitest）

本技能用于给《记账》项目创建单元测试、执行测试并给出测试报告。

- 测试工具：Vitest（用户选定，2026-08-16）
- 测试范围：**仅限工具函数**（纯逻辑零件，不测界面组件和数据库，用户选定 2026-08-16）

## 首次使用：安装测试工具

若项目尚未安装 Vitest（检查 package.json 的 devDependencies 里是否有 vitest），先执行：

```bash
npm install -D vitest
```

然后给 package.json 的 scripts 添加测试脚本：

```json
"test": "vitest run"
```

（`vitest run` 是跑完就退出；不加 run 的 `vitest` 是常驻监视模式，改代码自动重跑，开发时可用。）

## 创建单元测试

1. **找零件**：在 [src/renderer/src/utils.ts](src/renderer/src/utils.ts) 等文件里找纯函数（不碰界面、不碰数据库的计算逻辑）。目前已知的好零件：
   - `formatAmount`：金额（分）格式化为 ¥ 元两位小数，收入带 + 号，负数显示 -¥；
   - `dayLabel`：日期分组标题（今天 / 昨天 / M月D日 / 跨年带年份）；
   - `errMsg`：错误信息转中文提示。
2. **写检查清单**：测试文件命名 `xxx.test.ts`，放在源文件同目录，例如 [src/renderer/src/utils.test.ts](src/renderer/src/utils.test.ts)。
3. **用三个基本零件写检查**：
   - `describe`：给一组相关检查起名字（如「金额格式化」）；
   - `it`：一条检查，写明「输入什么 → 期望什么」；
   - `expect(实际结果).toBe(期望结果)`：对比判断，不一致就亮红灯。
4. **覆盖正常情况和边界情况**：如 0 元、负数、两位小数四舍五入、跨年日期等。

示例：

```ts
import { describe, it, expect } from 'vitest'
import { formatAmount } from './utils'

describe('金额格式化 formatAmount', () => {
  it('支出 1234 分显示 ¥12.34', () => {
    expect(formatAmount(1234, 'expense')).toBe('¥12.34')
  })
  it('收入 500 分显示 +¥5.00', () => {
    expect(formatAmount(500, 'income')).toBe('+¥5.00')
  })
  it('负数显示 -¥（结余为负时）', () => {
    expect(formatAmount(-100)).toBe('-¥1.00')
  })
})
```

## 执行测试

在项目根目录执行：

```bash
npm test
```

若刚装好工具或提示找不到 vitest，先执行 `npm install` 再跑。

## 测试报告（重要）

跑完后用大白话向用户汇报「成绩单」：

1. **总成绩**：一共几个检查、几个通过、几个失败（vitest 输出的 Test Files / Tests 统计，注意「Test Files」指测试文件数，「Tests」才是检查条数）。
2. **有失败时**：逐个指出失败的检查叫什么、期望结果是什么、实际算出什么，并判断代码哪里可能出错、打算怎么修。
3. **网页版报告（可选）**：用户想看网页版成绩单时，执行 `npx vitest run --reporter=html`，把生成的 html 报告文件路径告诉用户，用浏览器打开即可（绿多红少一目了然）。
4. 不要只丢结论，必须用大白话解释「为什么失败、下一步怎么办」。

## 注意

- 测试文件不依赖 Electron 窗口，跑得很快，无需启动应用。
- 只测工具函数；如果用户想测界面或数据库，先解释那需要额外工具（模拟浏览器、测试数据库），再让用户决定。
- 写完测试并跑通后，建议提醒用户用「存档」把测试成果存起来。
