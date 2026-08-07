import { AppState, Platform } from 'react-native';

const MAX_STRING_LENGTH = 2000;

type DeviceLogLevel = 'info' | 'warn' | 'error';

const originalConsole = {
  info: (console.info || console.log).bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

let installed = false;

const truncateString = (value: string): string => {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STRING_LENGTH)}... [truncated ${value.length - MAX_STRING_LENGTH} chars]`;
};

const safeNormalize = (value: unknown, depth = 0, seen = new WeakSet<object>()): unknown => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (typeof value === 'string') {
    return truncateString(value);
  }

  if (value === null || typeof value !== 'object') {
    if (typeof value === 'function') {
      return `[Function ${value.name || 'anonymous'}]`;
    }
    return value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  if (depth >= 3) {
    return '[Object]';
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, 30).map(item => safeNormalize(item, depth + 1, seen));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 40)
      .map(([key, item]) => [key, safeNormalize(item, depth + 1, seen)])
  );
};

export const logDevice = (
  level: DeviceLogLevel,
  scope: string,
  message: string,
  details?: unknown
) => {
  const prefix = `[${scope}] ${truncateString(message)}`;

  if (details === undefined) {
    originalConsole[level](prefix);
    return;
  }

  originalConsole[level](prefix, safeNormalize(details));
};

export const logInfo = (scope: string, message: string, details?: unknown) =>
  logDevice('info', scope, message, details);

export const logWarn = (scope: string, message: string, details?: unknown) =>
  logDevice('warn', scope, message, details);

export const logError = (scope: string, message: string, details?: unknown) =>
  logDevice('error', scope, message, details);

export const installDeviceLogging = () => {
  if (installed) {
    return;
  }

  installed = true;

  const errorUtils = (globalThis as any).ErrorUtils;
  if (errorUtils?.setGlobalHandler) {
    const previousHandler = errorUtils.getGlobalHandler?.();
    errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      logError('GlobalError', 'Unhandled JS exception', { error, isFatal });
      previousHandler?.(error, isFatal);
    });
  }

  AppState.addEventListener('change', nextState => {
    logInfo('AppState', `App state changed to ${nextState}`);
  });

  logInfo('Logger', 'Runtime logging installed', {
    platform: Platform.OS,
    platformVersion: Platform.Version,
  });
};
