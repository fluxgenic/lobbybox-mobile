import {ParsedApiError, getDisplayMessage} from './error';

export type ToastType = 'info' | 'success' | 'error';

export type ToastOptions = {
  /**
   * The style of toast to render. Defaults to `info`.
   */
  type?: ToastType;
  /**
   * Optional supporting text rendered under the main message.
   */
  subtitle?: string;
  /**
   * How long the toast should remain visible before dismissing, in milliseconds.
   */
  duration?: number;
};

export type ToastMessage = {
  id: number;
  message: string;
  subtitle?: string;
  type: ToastType;
  duration: number;
};

type ToastListener = (toast: ToastMessage) => void;

const listeners = new Set<ToastListener>();

let counter = 0;

export const subscribeToToasts = (listener: ToastListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const emitToast = (toast: ToastMessage) => {
  listeners.forEach(listener => listener(toast));
};

export const showToast = (message: string, options: ToastOptions = {}) => {
  const toast: ToastMessage = {
    id: ++counter,
    message,
    subtitle: options.subtitle,
    type: options.type ?? 'info',
    duration: options.duration ?? 3200,
  };

  emitToast(toast);
  return toast;
};

export const showErrorToast = (error: ParsedApiError) => {
  const message = getDisplayMessage(error);
  const subtitle = error.requestId ? `Request ID: ${error.requestId}` : undefined;

  showToast(message, {
    type: 'error',
    subtitle,
    duration: 6000,
  });
};
