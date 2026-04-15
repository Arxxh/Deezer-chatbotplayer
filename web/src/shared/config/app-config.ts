const FALLBACK_API_BASE_URL = 'http://127.0.0.1:4000/api/v1';

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? FALLBACK_API_BASE_URL;
}
