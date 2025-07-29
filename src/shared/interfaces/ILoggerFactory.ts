import type { ILogger, LogLevel } from './ILogger';

export interface ILoggerFactoryOptions extends Record<string, any> {
  level?: LogLevel;
}

export interface ILoggerFactory {
  createLogger(component: string, options?: ILoggerFactoryOptions): ILogger;
} 