const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

type ApiErrorResponse = {
  message?: string
  error?: string
}

export class ApiError extends Error {
  status: number
  details?: ApiErrorResponse

  constructor(message: string, status: number, details?: ApiErrorResponse) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers)

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const details = await readJson<ApiErrorResponse>(response)
    const message =
      details?.message || details?.error || `Request failed with status ${response.status}`

    throw new ApiError(message, response.status, details)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return readJson<T>(response)
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text()

  if (!text) {
    return undefined as T
  }

  try {
    return JSON.parse(text) as T
  } catch {
    return undefined as T
  }
}
