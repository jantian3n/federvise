# Federvise

一个单用户 ActivityPub 博客系统。用 Markdown 写作，发布到 Fediverse 联邦宇宙。

## 特性

- **初始化向导** - 首次部署时通过网页完成配置，无需手动编辑配置文件
- **双因素认证** - 使用 TOTP 验证码登录，支持 Google Authenticator 等应用
- **快捷发布** - 首页直接发布内容，类似 Twitter/Mastodon 体验
- **互动显示** - 自动收取并显示来自 Fediverse 的评论、点赞、转发
- **Markdown 写作** - 支持 YAML frontmatter 的 Markdown 文件
- **ActivityPub 联邦** - 兼容 Mastodon、Misskey、Pleroma 等
- **REST API** - 支持程序化访问
- **RSS/JSON Feed** - 传统订阅方式
- **暗色模式** - 跟随系统偏好自动切换

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/jantian3n/federvise.git
cd federvise

# 安装依赖
npm install

# 构建项目
npm run build

# 启动服务
npm start

# 访问 http://localhost:3000/setup 完成初始化
```

## 初始化向导

首次访问时会自动跳转到初始化向导：

1. **站点信息** - 设置域名、用户名、显示名称、简介
2. **设置密码** - 创建管理员密码（至少 8 位）
3. **启用 2FA** - 扫描二维码，绑定 TOTP 验证器

完成后自动登录，配置保存在数据库中。

## 写作与发布

### 方式一：网页快捷发布

登录后首页顶部会显示发布框：

- **只填内容** → 创建笔记（类似推文）
- **填写标题 + 内容** → 创建文章

发布后自动推送到所有关注者。

### 方式二：Markdown 文件

在 `content/` 目录创建 Markdown 文件：

```markdown
---
title: 我的第一篇文章
date: 2026-01-02
tags: [博客, ActivityPub]
---

这里是正文内容。支持 **粗体**、*斜体*、`代码` 等格式。
```

然后通过管理后台或命令行发布：

```bash
# 查看所有文章
npm run publish

# 发布指定文章
npm run publish hello-world

# 发布所有未发布的文章
npm run publish --all
```

### 方式三：REST API

```bash
# 创建并发布文章
curl -X POST -H "Authorization: Bearer 你的密码" \
  -H "Content-Type: application/json" \
  -d '{"slug": "my-post", "content": "---\ntitle: 标题\ndate: 2026-01-03\n---\n\n内容", "publish": true}' \
  https://你的域名/api/posts

# 快捷发布笔记
curl -X POST -H "Authorization: Bearer 你的密码" \
  -H "Content-Type: application/json" \
  -d '{"content": "这是一条快捷笔记"}' \
  https://你的域名/api/notes
```

## 互动功能

当 Fediverse 用户与你的帖子互动时：

| 互动类型 | 显示效果 |
|---------|---------|
| 评论/回复 | 显示评论者头像、用户名、内容 |
| 点赞 | 显示点赞者头像列表 |
| 转发/Boost | 显示转发者头像列表 |

首页显示互动计数：`💬 3  ❤️ 5  🔁 2`

文章详情页显示完整互动列表。

## 关注此博客

在 Mastodon 或其他 Fediverse 应用中搜索：

```
@你的用户名@你的域名
```

点击关注，新文章会自动出现在时间线。

## 端点列表

| 端点 | 说明 |
|------|------|
| `/` | 博客首页 |
| `/posts/:slug` | 文章详情页 |
| `/feed.xml` | RSS 订阅 |
| `/feed.json` | JSON Feed |
| `/login` | 登录页面 |
| `/admin` | 管理后台 |
| `/api/posts` | API: 文章列表/创建 |
| `/api/posts/:slug/publish` | API: 发布文章 |
| `/api/notes` | API: 快捷发布笔记 |
| `/.well-known/webfinger` | WebFinger 发现 |
| `/users/:username` | ActivityPub Actor |
| `/inbox` | ActivityPub 收件箱 |
| `/health` | 健康检查 |

## 生产部署

详见 [DEPLOY.md](DEPLOY.md)。

基本步骤：

```bash
# 构建
npm run build

# 使用 systemd 管理服务
sudo cp federvise.service /etc/systemd/system/
sudo systemctl enable federvise
sudo systemctl start federvise
```

⚠️ **重要**：必须绑定域名！

Federvise 是 ActivityPub 服务，**无法使用 IP 地址或 localhost 运行**。你需要：

1. 拥有一个域名（如 `blog.example.com`）
2. 将域名解析到你的服务器
3. 配置 HTTPS 证书（Let's Encrypt 等）
4. 设置反向代理（Nginx、Caddy 等）

其他要求：
- Node.js 20+
- 反向代理（Nginx Proxy Manager、Caddy 等）

> 注意：不支持 Cloudflare Pages、Vercel 等无服务器平台，因为需要持久化存储和文件系统。

## 技术栈

- **运行时**: Node.js + TypeScript
- **框架**: Hono
- **数据库**: SQLite (sql.js)
- **认证**: bcrypt + TOTP (otplib)
- **协议**: ActivityPub / WebFinger

## 许可证

MIT
