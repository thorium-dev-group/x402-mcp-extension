export interface ILogContext {
  component?: string;
  operation?: string;
  requestId?: string;
  sessionId?: string;
  [key: string]: any;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Simple logging interface with variable arguments
 */
export interface ILogger {
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
} 