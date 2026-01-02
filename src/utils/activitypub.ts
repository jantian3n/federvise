// ActivityPub 常量和工具函数

export const AP_CONTEXT = [
  'https://www.w3.org/ns/activitystreams',
  'https://w3id.org/security/v1',
];

export const AP_PUBLIC = 'https://www.w3.org/ns/activitystreams#Public';

// ActivityPub Content-Type
export const AP_CONTENT_TYPE = 'application/activity+json';
export const AP_ACCEPT = 'application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"';

// 判断请求是否接受 ActivityPub JSON
export function acceptsActivityPub(accept: string | undefined): boolean {
  if (!accept) return false;
  return accept.includes('application/activity+json') ||
         accept.includes('application/ld+json');
}
