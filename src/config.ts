/**
 * 配置对象
 * 支持从数据库加载，fallback 到环境变量
 */

// 内部状态
let _domain = process.env.DOMAIN || 'example.com';
let _port = parseInt(process.env.PORT || '3000', 10);
let _username = process.env.USERNAME || 'blog';
let _displayName = process.env.DISPLAY_NAME || 'My Blog';
let _summary = process.env.SUMMARY || 'A personal blog powered by ActivityPub';
let _adminPassword = process.env.ADMIN_PASSWORD || 'changeme';

export const config = {
  // 站点基本信息
  get domain() {
    return _domain;
  },
  get port() {
    return _port;
  },

  // ActivityPub 用户信息
  get username() {
    return _username;
  },
  get displayName() {
    return _displayName;
  },
  get summary() {
    return _summary;
  },

  // 管理员密码（仅用于 API Bearer Token 兼容）
  get adminPassword() {
    return _adminPassword;
  },

  // 派生的 URL
  get baseUrl() {
    return `https://${_domain}`;
  },

  get actorId() {
    return `${this.baseUrl}/users/${_username}`;
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

/**
 * 从数据库加载配置（在应用启动时调用）
 */
export async function loadConfigFromDb(): Promise<void> {
  // 动态导入避免循环依赖
  const { getSiteConfig } = await import('./services/config.js');
  const dbConfig = await getSiteConfig();

  _domain = dbConfig.domain;
  _port = dbConfig.port;
  _username = dbConfig.username;
  _displayName = dbConfig.displayName;
  _summary = dbConfig.summary;
}

/**
 * 更新配置（初始化向导使用）
 */
export function updateConfig(newConfig: {
  domain?: string;
  port?: number;
  username?: string;
  displayName?: string;
  summary?: string;
}): void {
  if (newConfig.domain) _domain = newConfig.domain;
  if (newConfig.port) _port = newConfig.port;
  if (newConfig.username) _username = newConfig.username;
  if (newConfig.displayName) _displayName = newConfig.displayName;
  if (newConfig.summary) _summary = newConfig.summary;
}
