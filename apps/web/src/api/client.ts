import type { ApiErrorResponse } from '@adamratzman/contracts';

const genericErrorMessage = 'Unable to complete the request.';

export class ApiClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
  }
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');

  if (init.body != null && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiClientError(genericErrorMessage, 0);
  }

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiClientError(genericErrorMessage, response.status);
    }

    if (isApiErrorResponse(body)) {
      throw new ApiClientError(body.error.message, response.status);
    }

    throw new ApiClientError(genericErrorMessage, response.status);
  }

  try {
    return await response.json() as T;
  } catch {
    throw new ApiClientError(genericErrorMessage, response.status);
  }
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const error: unknown = Reflect.get(value, 'error');
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const code: unknown = Reflect.get(error, 'code');
  const message: unknown = Reflect.get(error, 'message');

  return typeof error === 'object'
    && typeof code === 'string'
    && typeof message === 'string';
}
