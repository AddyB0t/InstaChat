import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, NativeModules, Platform, Share } from 'react-native';

const DEVICE_LOGS_KEY = '@notif_device_logs';
const MAX_LOG_ENTRIES = 1000;
const MAX_STRING_LENGTH = 2000;

type DeviceLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface DeviceLogEntry {
  id: string;
  timestamp: string;
  level: DeviceLogLevel;
  scope: string;
  message: string;
  details?: unknown;
  appState?: string;
  platform: {
    os: string;
    version: string | number;
  };
}

const originalConsole = {
  debug: (console.debug || console.log).bind(console),
  log: console.log.bind(console),
  info: (console.info || console.log).bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

let installed = false;
let flushing = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const pendingLogs: DeviceLogEntry[] = [];

type LogFileModuleType = {
  shareTextFile: (fileName: string, contents: string) => Promise<string>;
};

type NativeShareDebugModuleType = {
  flushNativeShareDebugEvents?: () => Promise<string[]>;
};

const { LogFileModule, SharedIntentModule } = NativeModules as {
  LogFileModule?: LogFileModuleType;
  SharedIntentModule?: NativeShareDebugModuleType;
};

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
      return `[Function ${(value as Function).name || 'anonymous'}]`;
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

const formatConsoleArgs = (args: unknown[]): string => (
  args
    .map(arg => {
      if (typeof arg === 'string') {
        return truncateString(arg);
      }
      try {
        return JSON.stringify(safeNormalize(arg));
      } catch {
        return String(arg);
      }
    })
    .join(' ')
);

const createEntry = (
  level: DeviceLogLevel,
  scope: string,
  message: string,
  details?: unknown
): DeviceLogEntry => ({
  id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  timestamp: new Date().toISOString(),
  level,
  scope,
  message,
  details: details === undefined ? undefined : safeNormalize(details),
  appState: AppState.currentState,
  platform: {
    os: Platform.OS,
    version: Platform.Version,
  },
});

const flushLogs = async () => {
  if (flushing) {
    return;
  }

  flushing = true;
  try {
    const batch = pendingLogs.splice(0, pendingLogs.length);
    if (batch.length === 0) {
      return;
    }

    const existingRaw = await AsyncStorage.getItem(DEVICE_LOGS_KEY);
    const existing = existingRaw ? JSON.parse(existingRaw) as DeviceLogEntry[] : [];
    const merged = [...existing, ...batch].slice(-MAX_LOG_ENTRIES);
    await AsyncStorage.setItem(DEVICE_LOGS_KEY, JSON.stringify(merged));
  } catch (error) {
    originalConsole.warn('[Logger] Failed to persist device logs', error);
  } finally {
    flushing = false;
    if (pendingLogs.length > 0) {
      scheduleFlush();
    }
  }
};

const scheduleFlush = () => {
  if (flushTimer) {
    return;
  }

  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushLogs().catch(error => {
      originalConsole.warn('[Logger] Failed to flush device logs', error);
    });
  }, 250);
};

const persistEntry = (entry: DeviceLogEntry) => {
  pendingLogs.push(entry);
  if (pendingLogs.length > MAX_LOG_ENTRIES) {
    pendingLogs.splice(0, pendingLogs.length - MAX_LOG_ENTRIES);
  }
  scheduleFlush();
};

export const logDevice = (
  level: DeviceLogLevel,
  scope: string,
  message: string,
  details?: unknown
) => {
  const entry = createEntry(level, scope, message, details);
  const consoleMethod = level === 'debug' ? 'debug' : level;

  if (details === undefined) {
    originalConsole[consoleMethod](`[${scope}] ${message}`);
  } else {
    originalConsole[consoleMethod](`[${scope}] ${message}`, details);
  }

  persistEntry(entry);
};

export const logDebug = (scope: string, message: string, details?: unknown) =>
  logDevice('debug', scope, message, details);

export const logInfo = (scope: string, message: string, details?: unknown) =>
  logDevice('info', scope, message, details);

export const logWarn = (scope: string, message: string, details?: unknown) =>
  logDevice('warn', scope, message, details);

export const logError = (scope: string, message: string, details?: unknown) =>
  logDevice('error', scope, message, details);

export const importNativeShareDebugEvents = async (reason = 'manual'): Promise<number> => {
  if (!SharedIntentModule?.flushNativeShareDebugEvents) {
    return 0;
  }

  try {
    const events = await SharedIntentModule.flushNativeShareDebugEvents();
    if (!Array.isArray(events) || events.length === 0) {
      return 0;
    }

    events.forEach((event, index) => {
      logInfo('NativeShare', event, {
        importReason: reason,
        nativeIndex: index + 1,
        nativeCount: events.length,
      });
    });
    await flushLogs();

    return events.length;
  } catch (error) {
    logWarn('NativeShare', 'Failed to import native share debug events', { reason, error });
    return 0;
  }
};

export const installDeviceLogging = () => {
  if (installed) {
    return;
  }

  installed = true;

  console.debug = (...args: unknown[]) => {
    originalConsole.debug(...args);
    persistEntry(createEntry('debug', 'console', formatConsoleArgs(args)));
  };
  console.log = (...args: unknown[]) => {
    originalConsole.log(...args);
    persistEntry(createEntry('info', 'console', formatConsoleArgs(args)));
  };
  console.info = (...args: unknown[]) => {
    originalConsole.info(...args);
    persistEntry(createEntry('info', 'console', formatConsoleArgs(args)));
  };
  console.warn = (...args: unknown[]) => {
    originalConsole.warn(...args);
    persistEntry(createEntry('warn', 'console', formatConsoleArgs(args)));
  };
  console.error = (...args: unknown[]) => {
    originalConsole.error(...args);
    persistEntry(createEntry('error', 'console', formatConsoleArgs(args)));
  };

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

  logInfo('Logger', 'Device logging installed');
};

export const getDeviceLogs = async (): Promise<DeviceLogEntry[]> => {
  await flushLogs();
  try {
    const raw = await AsyncStorage.getItem(DEVICE_LOGS_KEY);
    return raw ? JSON.parse(raw) as DeviceLogEntry[] : [];
  } catch (error) {
    originalConsole.warn('[Logger] Failed to read device logs', error);
    return [];
  }
};

export const clearDeviceLogs = async () => {
  pendingLogs.splice(0, pendingLogs.length);
  await AsyncStorage.removeItem(DEVICE_LOGS_KEY);
};

export const getDeviceLogsText = async (): Promise<string> => {
  const logs = await getDeviceLogs();
  if (logs.length === 0) {
    return 'No NotiF device logs recorded yet.';
  }

  return logs.map(entry => {
    const details = entry.details === undefined
      ? ''
      : ` details=${JSON.stringify(entry.details)}`;
    return `${entry.timestamp} ${entry.level.toUpperCase()} [${entry.scope}] ${entry.message}${details}`;
  }).join('\n');
};

export const shareDeviceLogs = async () => {
  await importNativeShareDebugEvents('beforeShareLogs');
  const message = await getDeviceLogsText();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `notif-debug-logs-${timestamp}.txt`;

  if (LogFileModule?.shareTextFile) {
    try {
      await LogFileModule.shareTextFile(fileName, message);
      return;
    } catch (error) {
      originalConsole.warn('[Logger] Native log file share failed, falling back to text share', error);
    }
  }

  await Share.share({
    title: 'NotiF Debug Logs',
    message,
  });
};
