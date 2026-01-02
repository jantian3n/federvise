export const config = {
  // 站点基本信息
  domain: process.env.DOMAIN || 'example.com',
  port: parseInt(process.env.PORT || '3000', 10),

  // ActivityPub 用户信息
  username: process.env.USERNAME || 'blog',
  displayName: process.env.DISPLAY_NAME || 'My Blog',
  summary: process.env.SUMMARY || 'A personal blog powered by ActivityPub',

  // 管理员密码（用于 /admin 页面）
  adminPassword: process.env.ADMIN_PASSWORD || 'changeme',

  // 派生的 URL
  get baseUrl() {
    return `https://${this.domain}`;
  },

  get actorId() {
    return `${this.baseUrl}/users/${this.username}`;
  },

  get inbox() {
    return `${this.actorId}/inbox`;
  },

  get outbox() {
    return `${this.actorId}/outbox`;
  },

  get followers() {
    return `${this.actorId}/followers`;
  },

  get publicKeyId() {
    return `${this.actorId}#main-key`;
  },
};
