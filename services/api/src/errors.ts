import type { ApiErrorResponse } from '@adamratzman/contracts';

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function errorResponse(code: string, message: string): ApiErrorResponse {
  return { error: { code, message } };
}
