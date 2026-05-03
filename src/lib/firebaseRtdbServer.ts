const FIREBASE_DB_URL =
  process.env.FIREBASE_DB_URL ??
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? '';

const FIREBASE_AUTH = process.env.FIREBASE_AUTH ?? process.env.FIREBASE_DB_AUTH ?? '';

function buildRtdbUrl(path: string): string {
  const trimmed = path.startsWith('/') ? path.slice(1) : path;
  const base = FIREBASE_DB_URL.replace(/\/$/, '');
  const authSuffix = FIREBASE_AUTH ? `?auth=${encodeURIComponent(FIREBASE_AUTH)}` : '';
  return `${base}/${trimmed}.json${authSuffix}`;
}

async function requestJson<T>(
  method: 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE',
  path: string,
  payload?: unknown,
): Promise<T | null> {
  const res = await fetch(buildRtdbUrl(path), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Firebase RTDB ${method} failed: ${res.status}`);
  }

  if (res.status === 204) {
    return null;
  }

  return (await res.json()) as T;
}

export async function rtdbGet<T>(path: string): Promise<T | null> {
  return requestJson<T>('GET', path);
}

export async function rtdbPut(path: string, payload: unknown): Promise<void> {
  await requestJson<unknown>('PUT', path, payload);
}

export async function rtdbPatch(path: string, payload: unknown): Promise<void> {
  await requestJson<unknown>('PATCH', path, payload);
}

export async function rtdbPost<T>(path: string, payload: unknown): Promise<T | null> {
  return requestJson<T>('POST', path, payload);
}

export async function rtdbDelete(path: string): Promise<void> {
  await requestJson<unknown>('DELETE', path);
}
