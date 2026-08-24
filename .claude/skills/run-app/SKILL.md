---
name: run-app
description: 当用户要求「启动应用」「运行 app」「打开记账软件」「跑一下」「运行看看效果」时使用。用于在开发模式下启动《记账》桌面应用（Electron）并确认窗口正常弹出。
---

# 启动记账应用（开发模式）

按以下步骤在开发模式下启动《记账》桌面应用，并确认应用窗口正常弹出。

## 第一步：清除环境变量坑（重要）

在 VSCode 环境中 `ELECTRON_RUN_AS_NODE=1` 环境变量会被自动设置，导致 Electron 以纯命令行模式启动而报错
`Cannot read properties of undefined (reading 'isPackaged')`。启动前必须先清除该变量。

当前终端为 Git Bash，使用：

```bash
unset ELECTRON_RUN_AS_NODE
```

（若终端是 Windows cmd，改用 `set ELECTRON_RUN_AS_NODE=`）

## 第二步：启动应用

在项目根目录执行：

```bash
unset ELECTRON_RUN_AS_NODE && npm run dev
```

注意：不要单独运行 `npm run dev`，必须连同清除环境变量一起执行。

## 第三步：验证结果

- 确认《记账》应用窗口正常弹出后，用大白话告诉用户「应用已启动，窗口已弹出」。
- 若报错 `Cannot read properties of undefined (reading 'isPackaged')`：说明环境变量没清除干净，重新执行第二步的完整命令。
- 若弹出其他报错：把报错内容原样告诉用户，并说明可能的原因。

## 补充说明

- `npm run dev` 是开发模式（改代码后自动看到效果）。安装版打包（`npm run build:win`）不属于本技能范围。
- 开发模式启动后终端会被应用占用。若启动后还需要执行其他命令，用后台方式启动应用，再确认窗口弹出。
- 若提示缺少依赖（node_modules 不存在），先执行 `npm install` 再启动。
