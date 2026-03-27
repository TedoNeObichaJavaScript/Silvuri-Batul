const BASE = import.meta.env.BASE_URL || '/';

export function assetUrl(path) {
  if (!path || path.startsWith('http')) return path;
  return BASE.replace(/\/$/, '') + path;
}
