import axios from 'axios';

export type ParsedApiError = {
  message: string;
  code?: string;
  requestId?: string;
  status?: number;
  original?: unknown;
};

type ErrorPayload = {
  message?: string | null;
  code?: string | null;
  requestId?: string | null;
};

const getMessage = (
  payload: ErrorPayload | undefined,
  axiosMessage: string | undefined,
  fallbackMessage: string,
) => {
  const fromPayload = payload?.message?.trim();
  if (fromPayload) {
    return fromPayload;
  }
  if (axiosMessage) {
    return axiosMessage;
  }
  return fallbackMessage;
};

export const parseApiError = (
  error: unknown,
  fallbackMessage = 'Something went wrong. Please try again.',
): ParsedApiError => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const payload = (error.response?.data ?? {}) as ErrorPayload | undefined;
    const message = getMessage(payload, error.message, fallbackMessage);

    return {
      message,
      code: payload?.code ?? undefined,
      requestId: payload?.requestId ?? undefined,
      status,
      original: error,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message || fallbackMessage,
      original: error,
    };
  }

  return {
    message: fallbackMessage,
    original: error,
  };
};

export const isForbiddenError = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 403;
  }
  if (typeof error === 'object' && error && 'status' in error) {
    const status = (error as {status?: number}).status;
    return status === 403;
  }
  return false;
};

export const getDisplayMessage = (error: ParsedApiError): string => {
  if (error.status === 403) {
    return 'No permission for this area';
  }
  return error.message;
};
