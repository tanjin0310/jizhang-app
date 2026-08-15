# 记账 App

一个简单易用的个人桌面记账应用，帮你记录每一笔人民币收支。**所有数据保存在你本机，不联网、不上传，隐私安全。**

支持 Windows 10/11 与 macOS。

## ✨ 功能

- **记一笔**：支出 / 收入，金额、两级分类（一级大类 → 二级小类）、日期、备注（可选）；支持 Ctrl+N（macOS 为 Cmd+N）快速记账，连续记账类型保持不变
- **首页本月概览**：本月支出 / 收入 / 结余、今日收支、最近 5 笔流水，支持切换月份
- **流水管理**：按天分组（今天 / 昨天 / 具体日期）、每天小计（支出 / 收入分两段）、按备注搜索、按分类筛选、编辑、删除（二次确认）
- **统计图表**：支出 / 收入切换，分类占比饼图、每日收支柱状图（支出红、收入绿）、一级分类金额排行
- **分类管理**：内置 10 个支出一级大类 + 5 个收入一级大类，可自由添加 / 删除二级小类（已被使用的分类不可删除，保护历史数据）
- **小游戏**：内置贪吃蛇（经典模式，方向键控制，吃红点变长、撞墙或撞到自己结束）

## 🛠 技术栈

Electron · React · TypeScript · Ant Design · SQLite · ECharts · electron-vite · electron-builder

## 🚀 本地运行

环境要求：Node.js 18 或更新版本

```bash
npm install   # 安装依赖（第一次运行前执行一次）
npm run dev   # 启动开发版
```

> Windows 提示：如果在 VSCode 里启动报错，先清除 `ELECTRON_RUN_AS_NODE` 环境变量再运行（cmd 里执行 `set ELECTRON_RUN_AS_NODE=`）。

## 📦 打包安装包

```bash
npm run build:win   # 生成 Windows 安装包（输出到 dist/ 目录，.exe 文件）
```

macOS 安装包需在 Mac 电脑上构建（或使用 GitHub Actions 云构建），代码本身跨平台无需改动。

## 🔒 数据与隐私

- 所有账本数据保存在本机 SQLite 数据库文件，不联网、不上传任何网络
- 数据位置：Windows `%APPDATA%\jizhang\`；macOS `~/Library/Application Support/jizhang/`
- 每次启动自动检查数据库结构，老账本自动升级并先备份（`jizhang.db.bak`），只加列不删数据

## 📖 更多说明

完整的[产品文档](CLAUDE.md)包含分类体系明细、界面规范与开发约定。
