# Federvise 中文指南

一个支持 ActivityPub 协议的单用户博客系统。用 Markdown 写作，发布到联邦宇宙。

---

## 目录

- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [VPS 部署](#vps-部署)
- [Nginx Proxy Manager 配置](#nginx-proxy-manager-配置)
- [日常使用](#日常使用)
- [Obsidian 插件](#obsidian-插件)
- [更改域名](#更改域名)
- [故障排查](#故障排查)
- [备份与恢复](#备份与恢复)

---

## 功能特性

- **Markdown 写作**：支持 frontmatter（标题、日期、标签）
- **ActivityPub 联邦**：兼容 Mastodon、Misskey、Pleroma 等
- **Web 管理后台**：可视化管理和发布文章
- **REST API**：程序化访问接口
- **Obsidian 插件**：在 Obsidian 中写作并发布
- **RSS/JSON Feed**：标准订阅格式
- **深色模式**：跟随系统设置

---

## 快速开始

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/jantian3n/federvise.git
cd federvise

# 安装依赖
npm install

# 初始化数据库（生成 RSA 密钥）
npm run db:init

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 配置环境变量

创建 `.env` 文件或设置环境变量：

```bash
DOMAIN=blog.yourdomain.com    # 你的域名（必填）
USERNAME=blog                  # ActivityPub 用户名
DISPLAY_NAME="我的博客"        # 显示名称
SUMMARY="一个个人博客"         # 个人简介
ADMIN_PASSWORD=your-secret    # 管理后台和 API 密码
PORT=3000                      # 端口号
```

---

## VPS 部署

### 前置要求

- Linux 服务器（Ubuntu 22.04+ / Debian 12+ 推荐）
- Node.js 20+
- 域名（已解析到服务器 IP）
- Nginx Proxy Manager（或其他反向代理）

### 第一步：安装 Node.js

```bash
# Ubuntu / Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# 验证安装
node -v  # 应显示 v20.x.x
```

### 第二步：部署代码

```bash
# 克隆仓库
git clone https://github.com/jantian3n/federvise.git /var/www/federvise
cd /var/www/federvise

# 安装依赖
npm install

# 构建
npm run build
```

### 第三步：配置

```bash
# 复制配置模板
cp .env.example .env

# 编辑配置
nano .env
```

修改为你的实际配置：

```bash
DOMAIN=blog.yourdomain.com
USERNAME=blog
DISPLAY_NAME="你的博客名称"
SUMMARY="你的博客简介"
ADMIN_PASSWORD=your-secret
PORT=3000
NODE_ENV=production
```

### 第四步：初始化数据库

```bash
npm run db:init
```

这会：
- 创建 SQLite 数据库
- 生成 RSA 密钥对（用于 ActivityPub 签名）
- 创建默认用户

### 第五步：设置 Systemd 服务

```bash
# 复制服务文件
sudo cp federvise.service /etc/systemd/system/

# 如果你不是用 www-data 用户，需要修改服务文件
sudo nano /etc/systemd/system/federvise.service
# 将 User=www-data 改为你的用户名

# 重新加载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start federvise

# 设置开机自启
sudo systemctl enable federvise

# 查看状态
sudo systemctl status federvise
```

### 第六步：查看日志

```bash
# 实时查看日志
sudo journalctl -u federvise -f

# 查看最近 50 行日志
sudo journalctl -u federvise -n 50
```

---

## Nginx Proxy Manager 配置

### 添加 Proxy Host

1. 登录 Nginx Proxy Manager 面板
2. 点击 **Proxy Hosts** → **Add Proxy Host**

### Details 标签页

| 字段 | 值 |
|------|-----|
| Domain Names | `blog.yourdomain.com` |
| Scheme | `http` |
| Forward Hostname / IP | `127.0.0.1`（或服务器内网 IP） |
| Forward Port | `3000` |
| Block Common Exploits | ✓ 勾选 |
| Websockets Support | ✓ 勾选（可选） |

### SSL 标签页

| 字段 | 值 |
|------|-----|
| SSL Certificate | Request a new SSL Certificate |
| Force SSL | ✓ 勾选 |
| HTTP/2 Support | ✓ 勾选 |
| HSTS Enabled | ✓ 勾选 |
| Email for Let's Encrypt | 你的邮箱 |

### Advanced 标签页（可选）

添加以下配置优化 ActivityPub：

```nginx
# 增加超时时间（联邦请求可能较慢）
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;

# 传递真实 IP
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# ActivityPub 需要正确的 Host 头
proxy_set_header Host $host;
```

点击 **Save** 完成配置。

---

## 日常使用

### 写文章

在 `content/` 目录创建 Markdown 文件：

```bash
nano content/my-first-post.md
```

文件格式：

```markdown
---
title: 我的第一篇文章
date: 2026-01-02
tags: [博客, 测试]
---

这是文章内容。

支持 **粗体**、*斜体*、`代码` 等 Markdown 语法。

## 二级标题

- 列表项 1
- 列表项 2
```

### 发布文章

#### 方式一：Web 管理后台

访问 `https://yourdomain.com/admin`

- 用户名：`admin`
- 密码：你的 `ADMIN_PASSWORD`

在这里可以查看所有文章并一键发布。

#### 方式二：命令行

```bash
# 查看所有文章及发布状态
npm run publish

# 发布指定文章
npm run publish my-first-post

# 发布所有未发布的文章
npm run publish --all
```

#### 方式三：REST API

```bash
# 列出文章
curl -H "Authorization: Bearer YOUR_PASSWORD" \
  https://yourdomain.com/api/posts

# 创建并发布文章
curl -X POST -H "Authorization: Bearer YOUR_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"slug": "my-post", "content": "---\ntitle: My Post\ndate: 2026-01-03\n---\n\nHello!", "publish": true}' \
  https://yourdomain.com/api/posts

# 发布已有文章
curl -X POST -H "Authorization: Bearer YOUR_PASSWORD" \
  https://yourdomain.com/api/posts/my-post/publish
```

#### 方式四：Obsidian 插件

详见 [obsidian-plugin/README.md](obsidian-plugin/README.md)。

### 文章状态说明

```
📝 Available posts:

  [ ] my-first-post      # 未发布
      "我的第一篇文章"

  [✓] hello-world        # 已发布
      "Hello World"
```

### 更新代码

```bash
cd /var/www/federvise
git pull
npm install
npm run build
sudo systemctl restart federvise
```

### 常用命令

```bash
# 重启服务
sudo systemctl restart federvise

# 停止服务
sudo systemctl stop federvise

# 启动服务
sudo systemctl start federvise

# 查看实时日志
sudo journalctl -u federvise -f
```

---

## Obsidian 插件

使用 Obsidian 写作并直接发布到博客。

### 安装

1. 下载 `obsidian-plugin/` 目录中的 `main.js` 和 `manifest.json`
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

### 配置

1. 打开 Obsidian 设置 → Federvise
2. 填写：
   - **API URL**: 你的博客地址（如 `https://luaner.de`）
   - **API Token**: 你的 `ADMIN_PASSWORD`

### 使用

- **命令面板** (Ctrl/Cmd + P)：
  - "Publish current note to Federvise" - 保存并发布到 Fediverse
  - "Save current note to Federvise" - 仅保存（不推送到联邦）

- **右键菜单**：右键点击 Markdown 文件 → "Publish to Federvise"

---

## 更改域名

> ⚠️ **重要提示**：ActivityPub 中域名是身份的一部分。更改域名后，旧的关注者将失效，需要重新关注。

### 更改步骤

```bash
cd /var/www/federvise

# 1. 停止服务
sudo systemctl stop federvise

# 2. 修改配置
nano .env
# 将 DOMAIN=old.domain.com 改为 DOMAIN=new.domain.com

# 3. 删除旧数据库并重新初始化
rm data/blog.db
npm run db:init

# 4. 重启服务
sudo systemctl start federvise

# 5. 在 Nginx Proxy Manager 添加新域名
```

### 为什么需要重置数据库？

| 数据 | 影响 |
|------|------|
| RSA 密钥 | keyId 格式是 `https://域名/users/用户名#main-key`，域名变了需要重新生成 |
| 关注者 | 他们关注的是旧的 Actor ID，无法自动迁移 |
| 已发布文章 | activity_id 包含旧域名，需要重新发布 |

### 重新发布文章

文章的 Markdown 文件在 `content/` 目录，不受影响。重置后重新发布：

```bash
npm run publish --all
```

### 建议

- **一开始就用稳定域名**，避免后续更改
- **提前通知关注者**，发一篇文章告知新地址
- **保留旧域名一段时间**，可以做 301 重定向

---

## 故障排查

### 问题：Mastodon 搜索找不到用户

1. **检查 HTTPS**：确保 SSL 证书正常
   ```bash
   curl -v https://blog.yourdomain.com/
   ```

2. **检查 WebFinger**：
   ```bash
   curl "https://blog.yourdomain.com/.well-known/webfinger?resource=acct:blog@blog.yourdomain.com"
   ```
   应返回 JSON 格式的用户信息。

3. **检查域名配置**：确保 `.env` 中的 `DOMAIN` 与实际域名一致

### 问题：关注后收不到文章

1. **确认关注者已保存**：
   ```bash
   # 需要先安装 sqlite3
   sqlite3 data/blog.db "SELECT * FROM followers;"
   ```

2. **检查发布日志**：
   ```bash
   npm run publish <slug>
   ```

3. **查看活动记录**：
   ```bash
   sqlite3 data/blog.db "SELECT * FROM activities ORDER BY id DESC LIMIT 10;"
   ```

### 问题：服务启动失败

```bash
# 查看详细错误
sudo journalctl -u federvise -n 50

# 手动测试启动
cd /var/www/federvise
node dist/index.js
```

### 问题：端口被占用

```bash
# 查看占用端口的进程
lsof -i:3000

# 杀死进程
kill -9 <PID>
```

---

## 备份与恢复

### 手动备份

```bash
cd /var/www/federvise

# 备份数据库、文章和配置
tar -czvf federvise-backup-$(date +%Y%m%d).tar.gz data/ content/ .env
```

### 自动备份（每天凌晨 3 点）

```bash
# 编辑 crontab
crontab -e

# 添加以下行
0 3 * * * cd /var/www/federvise && tar -czvf /backup/federvise-$(date +\%Y\%m\%d).tar.gz data/ content/ .env
```

### 恢复备份

```bash
cd /var/www/federvise

# 停止服务
sudo systemctl stop federvise

# 解压备份
tar -xzvf federvise-backup-20260102.tar.gz

# 启动服务
sudo systemctl start federvise
```

---

## API 端点

| 端点 | 描述 |
|------|------|
| `/` | 博客首页 |
| `/posts/:slug` | 文章详情页 |
| `/feed.xml` | RSS 订阅 |
| `/feed.json` | JSON Feed 订阅 |
| `/admin` | 管理后台（Basic Auth） |
| `/api/posts` | API：列出/创建文章（Bearer Auth） |
| `/api/posts/:slug/publish` | API：发布文章 |
| `/.well-known/webfinger` | WebFinger 发现 |
| `/users/:username` | ActivityPub Actor |
| `/users/:username/outbox` | 用户发件箱 |
| `/inbox` | 共享收件箱 |

---

## 联邦测试

部署完成后，测试联邦功能：

1. **打开 Mastodon**（如 mastodon.social）
2. **搜索** `@blog@blog.yourdomain.com`
3. **点击关注**
4. **发布文章**：
   ```bash
   npm run publish hello-world
   ```
5. **检查 Mastodon 时间线**，应该能看到新文章

---

## 许可证

MIT
