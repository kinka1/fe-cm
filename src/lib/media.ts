import { API_BASE_URL } from '../api/client';

export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}/${path.replace(/^\//, '')}`;
}

export function initials(name?: string | null): string {
  if (!name) return '?';

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('') || '?';
}
