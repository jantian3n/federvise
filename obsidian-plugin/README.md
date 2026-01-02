# Federvise Obsidian Plugin

将 Obsidian 笔记发布到你的 Federvise 博客。

## 安装

### 手动安装

1. 下载 `main.js` 和 `manifest.json`
2. 在 Obsidian 库中创建 `.obsidian/plugins/federvise-publish/` 文件夹
3. 将文件复制到该文件夹
4. 重启 Obsidian
5. 在设置 → 社区插件中启用 "Federvise Publish"

### 从源码构建

```bash
cd obsidian-plugin
npm install
npm run build
```

## 配置

1. 打开 Obsidian 设置 → Federvise
2. 填写：
   - **API URL**: 你的博客地址（如 `https://luaner.de`）
   - **API Token**: 你的 `ADMIN_PASSWORD`

## 使用

### 命令面板 (Ctrl/Cmd + P)

- **Publish current note to Federvise** - 保存并发布到 Fediverse
- **Save current note to Federvise** - 仅保存（不推送到联邦）

### 右键菜单

右键点击 Markdown 文件 → "Publish to Federvise"

## 笔记格式

确保笔记包含 YAML frontmatter：

```markdown
---
title: 文章标题
date: 2026-01-03
tags: [标签1, 标签2]
---

正文内容...
```

## 注意事项

- 文件名会被转换为 slug（小写、连字符）
- 例如：`My First Post.md` → `my-first-post`
- 已发布的文章不能重复发布（需要先在数据库中重置）
