# Linux VPS 部署指南

## 前置要求

- Linux 服务器 (Ubuntu 22.04+ / Debian 12+ 推荐)
- Node.js 20+
- 域名（已解析到服务器 IP）
- Nginx Proxy Manager (或其他反向代理)

---

## 第一步：服务器准备

```bash
# 安装 Node.js 20 (使用 NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证
node -v  # v20.x.x
npm -v
```

---

## 第二步：部署代码

```bash
# 创建目录
sudo mkdir -p /var/www/federvise
sudo chown $USER:$USER /var/www/federvise

# 方式1: 直接上传（推荐）
# 在本地打包后上传
# 本地执行:
tar -czvf federvise.tar.gz --exclude=node_modules --exclude=.git .
scp federvise.tar.gz user@your-server:/var/www/federvise/

# 服务器执行:
cd /var/www/federvise
tar -xzvf federvise.tar.gz
rm federvise.tar.gz

# 方式2: Git clone (如果你推送到了 GitHub)
# git clone https://github.com/yourname/federvise.git /var/www/federvise
```

---

## 第三步：安装依赖 & 构建

```bash
cd /var/www/federvise

# 安装依赖
npm install --production=false

# 构建
npm run build

# 初始化数据库
npm run db:init
```

---

## 第四步：配置环境变量

```bash
# 复制示例配置
cp .env.example .env

# 编辑配置
nano .env
```

修改为你的实际配置：

```bash
DOMAIN=blog.yourdomain.com
USERNAME=blog
DISPLAY_NAME="Your Blog Name"
SUMMARY="Your blog description"
PORT=3000
NODE_ENV=production
```

---

## 第五步：设置 Systemd 服务

```bash
# 复制服务文件
sudo cp federvise.service /etc/systemd/system/

# 修改用户（如果需要）
sudo nano /etc/systemd/system/federvise.service
# 将 User=www-data 改为你的用户，或创建专用用户

# 重新加载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start federvise

# 设置开机自启
sudo systemctl enable federvise

# 查看状态
sudo systemctl status federvise

# 查看日志
sudo journalctl -u federvise -f
```

---

## 第六步：Nginx Proxy Manager 配置

### 6.1 添加 Proxy Host

1. 登录 Nginx Proxy Manager 面板
2. 点击 **Proxy Hosts** → **Add Proxy Host**

### 6.2 Details 标签页

| 字段 | 值 |
|------|-----|
| Domain Names | `blog.yourdomain.com` |
| Scheme | `http` |
| Forward Hostname / IP | `127.0.0.1` (或服务器内网 IP) |
| Forward Port | `3000` |
| Block Common Exploits | ✓ |
| Websockets Support | ✓ (可选) |

### 6.3 SSL 标签页

| 字段 | 值 |
|------|-----|
| SSL Certificate | Request a new SSL Certificate |
| Force SSL | ✓ |
| HTTP/2 Support | ✓ |
| HSTS Enabled | ✓ |
| Email for Let's Encrypt | 你的邮箱 |

### 6.4 Advanced 标签页（可选）

添加自定义配置优化 ActivityPub：

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

## 第七步：验证部署

```bash
# 测试 WebFinger（在任意机器执行）
curl https://blog.yourdomain.com/.well-known/webfinger?resource=acct:blog@blog.yourdomain.com

# 测试 Actor
curl -H "Accept: application/activity+json" https://blog.yourdomain.com/users/blog

# 测试首页
curl https://blog.yourdomain.com/
```

---

## 第八步：测试联邦

1. 打开 Mastodon (如 mastodon.social)
2. 搜索 `@blog@blog.yourdomain.com`
3. 点击关注
4. 发布文章测试：

```bash
cd /var/www/federvise

# 创建新文章
cat > content/first-post.md << 'EOF'
---
title: 我的第一篇联邦文章
date: 2026-01-02
tags: [fediverse, test]
---

这是通过 ActivityPub 发布的第一篇文章！
EOF

# 发布到 Fediverse
npm run publish first-post
```

---

## 常用命令

```bash
# 重启服务
sudo systemctl restart federvise

# 查看实时日志
sudo journalctl -u federvise -f

# 列出文章
npm run publish

# 发布文章
npm run publish <slug>

# 重新初始化数据库（会丢失关注者！）
rm data/blog.db && npm run db:init
```

---

## 故障排查

### 问题：Mastodon 搜索找不到用户

1. 检查 HTTPS 是否正常工作
2. 确认 WebFinger 返回正确：
   ```bash
   curl -v "https://yourdomain.com/.well-known/webfinger?resource=acct:blog@yourdomain.com"
   ```
3. 检查域名配置是否与环境变量 `DOMAIN` 一致

### 问题：关注后收不到文章

1. 确认关注者已保存：
   ```bash
   sqlite3 data/blog.db "SELECT * FROM followers;"
   ```
2. 检查发布日志：
   ```bash
   npm run publish <slug>
   ```
3. 查看 activities 表确认投递记录

### 问题：服务启动失败

```bash
# 查看详细错误
sudo journalctl -u federvise -n 50

# 手动测试
cd /var/www/federvise
node dist/index.js
```

---

## 备份

```bash
# 备份数据库和配置
tar -czvf federvise-backup-$(date +%Y%m%d).tar.gz data/ content/ .env

# 定时备份 (crontab -e)
0 3 * * * cd /var/www/federvise && tar -czvf /backup/federvise-$(date +\%Y\%m\%d).tar.gz data/ content/ .env
```
