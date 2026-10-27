/**
 * Safe JSON fetch helper.
 *
 * Calling `res.json()` directly throws "Failed to execute 'json' on 'Response':
 * Unexpected end of JSON input" whenever the server answers with an empty body
 * (server restarting, proxy timeout, API not running, crashed request...).
 * This helper reads the body as text first and always throws a readable error.
 */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface FetchJsonOptions {
  /** Abort the request after this many ms (default 45s) */
  timeoutMs?: number;
  /** Extra attempts when the reply is empty / 5xx / network error (default 1) */
  retries?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJsonOnce<T>(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(input, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ApiError('Máy chủ phản hồi quá lâu. Vui lòng thử lại sau ít phút.', 408);
    }
    throw new ApiError('Không thể kết nối tới máy chủ. Hãy kiểm tra kết nối mạng hoặc xem server đã chạy chưa.', 0);
  } finally {
    clearTimeout(timer);
  }

  let text = '';
  try {
    text = await res.text();
  } catch {
    throw new ApiError('Kết nối tới máy chủ bị ngắt giữa chừng. Vui lòng thử lại.', res.status);
  }

  if (!text.trim()) {
    throw new ApiError(
      `Máy chủ trả về phản hồi rỗng (HTTP ${res.status}). Server có thể đang khởi động lại hoặc API chưa chạy — vui lòng thử lại sau vài giây.`,
      res.status >= 400 ? res.status : 502
    );
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ApiError(
      `Máy chủ trả về dữ liệu không phải JSON (HTTP ${res.status}). Có thể API chưa được chạy hoặc đang bị proxy chặn.`,
      res.status
    );
  }

  if (!res.ok) {
    throw new ApiError(
      (data && typeof data.error === 'string' && data.error) || `Yêu cầu thất bại (HTTP ${res.status}).`,
      res.status
    );
  }

  return data as T;
}

export async function fetchJson<T = any>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  { timeoutMs = 45000, retries = 1 }: FetchJsonOptions = {}
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchJsonOnce<T>(input, init, timeoutMs);
    } catch (err) {
      lastError = err;
      const status = err instanceof ApiError ? err.status : 0;
      // Only retry transient problems (network error / empty reply / bad gateway / unavailable)
      // never 4xx client errors, timeouts or 504 (the server already waited long enough)
      const transient = status === 0 || status === 502 || status === 503;
      if (!transient || attempt === retries) break;
      await sleep(1200);
    }
  }
  throw lastError;
}
