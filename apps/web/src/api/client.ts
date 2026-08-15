const jsonRequestInit = {
  headers: {
    accept: 'application/json',
  },
} as const;

export class ApiClientError extends Error {
  constructor(readonly status?: number) {
    super('The requested data could not be loaded.');
    this.name = 'ApiClientError';
  }
}

export async function fetchJson<T>(path: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, jsonRequestInit);
  } catch {
    throw new ApiClientError();
  }

  if (!response.ok) {
    throw new ApiClientError(response.status);
  }

  try {
    return await response.json() as T;
  } catch {
    throw new ApiClientError(response.status);
  }
}
