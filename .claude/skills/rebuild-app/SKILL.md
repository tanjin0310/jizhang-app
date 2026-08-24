---
name: rebuild-app
description: 当用户要求「重新打包」「重新生成安装包」「打包应用」「生成 exe」「做个安装包」时使用。用于把《记账》应用重新打包成 Windows 安装包（.exe 文件）。
---

# 重新打包记账应用（Windows 安装包）

按以下步骤把《记账》应用重新打包成 Windows 安装包（.exe 文件），输出到项目 `dist/` 目录。

## 第一步：执行打包命令

在项目根目录执行（带国内镜像，下载速度更快）：

```bash
ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/ CSC_IDENTITY_AUTO_DISCOVERY=false npm run build:win
```

注意：命令会先编译代码，再调用打包工具生成安装包，整个过程需要几分钟，耐心等待完成。

## 第二步：处理已知的打包坑（仅当报错时）

若报错 `Cannot create symbolic link`（Windows 无法创建符号链接，本机已知问题）：

1. 找到报错中提到的缓存目录 `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\`；
2. 手动把解压产物复制到其中的 `winCodeSign-2.6.0` 文件夹里（缺的 2 个 darwin 文件不影响 Windows 打包）；
3. 复制好后重新执行第一步的命令。

若以后 electron-builder 更换了新版本的 winCodeSign，需要重做这一步。

## 第三步：验证结果

- 打包成功后，`dist/` 目录里会生成安装包文件，文件名形如 `记账 Setup 0.1.0.exe`（版本号取自 package.json，升版本后文件名会变）。
- 用大白话告诉用户：安装包已生成、放在哪里、文件多大。
- 若中途报错，把报错内容原样告诉用户，并说明可能的原因（常见的就是第二步的符号链接坑）。

## 补充说明

- 安装包是「安装版」，给普通用户双击安装用；日常改代码看效果用 `/run-app` 开发模式即可。
- 重新打包会覆盖 dist 目录里同名的旧安装包。
- macOS 安装包需在 Mac 电脑上构建（或 GitHub Actions 云构建），本技能只做 Windows 版。
