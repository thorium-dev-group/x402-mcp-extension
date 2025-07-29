import type { ILogger, LogLevel } from '../interfaces/ILogger';
import type { ILoggerFactory, ILoggerFactoryOptions } from '../interfaces/ILoggerFactory';
import { ConsoleLogger } from './ConsoleLogger';

/**
 * Default console logger factory implementation
 */
export class ConsoleLoggerFactory implements ILoggerFactory {
  private validateLogLevel(level: string | undefined): LogLevel {
    if(!level) {
      return 'warn';
    }
    const validLevels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
    if (!validLevels.includes(level as LogLevel)) {
      throw new Error(`Invalid log level from environment: ${level}`);
    }
    return level as LogLevel;
  }

  createLogger(component: string, options?: ILoggerFactoryOptions): ILogger {
    const logLevel = options?.level || this.validateLogLevel(process.env.X402_LOG_LEVEL);
    return new ConsoleLogger(component, logLevel, options);
  }
} 