import type { ILogger, ILogContext, LogLevel } from '../interfaces/ILogger';

export interface ConsoleLoggerConfig extends Record<string, any> {
  showTimestamp?: boolean;
  showLevel?: boolean;
  showComponent?: boolean;
}

const DEFAULT_CONFIG: ConsoleLoggerConfig = {
  showTimestamp: true,
  showLevel: true,
  showComponent: true,
};

/**
 * Simple console-based logger implementation
 */
export class ConsoleLogger implements ILogger {
  private config: ConsoleLoggerConfig;
  private component: string;
  private level: LogLevel;

  constructor(component: string, level: LogLevel, config: ConsoleLoggerConfig = {}) {
    this.component = component;
    this.level = level;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  private shouldLog(messageLevel: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };
    return levels[messageLevel] <= levels[this.level];
  }

  private formatMessage(level: LogLevel, message: string, args: any[]): string {
    const parts: string[] = [];
    
    // Timestamp
    if (this.config.showTimestamp) {
      parts.push(new Date().toISOString().substring(11, 19)); // HH:mm:ss
    }
    
    // Level
    if (this.config.showLevel) {
      parts.push(`[${level.toUpperCase()}]`);
    }
    
    // Component
    if (this.config.showComponent) {
      parts.push(this.component);
    }

    // Extra
    if (this.config.extra) {
      parts.push(JSON.stringify(this.config.extra));
    }
    
    // Message
    parts.push(message);
    
    // Additional data
    if (args.length > 0) {
      const formattedArgs = args.map(arg => {
        if (arg instanceof Error) {
          return `${arg.message}\n${arg.stack}`;
        } else if (typeof arg === 'object' && arg !== null) {
          return JSON.stringify(arg);
        } else {
          return String(arg);
        }
      }).join(' ');
      
      if (formattedArgs) {
        parts.push(`(${formattedArgs})`);
      }
    }
    
    return parts.join(' ');
  }

  private log(level: LogLevel, message: string, args: any[]): void {
    if (!this.shouldLog(level)) return;
    
    const formattedMessage = this.formatMessage(level, message, args);
    
    switch (level) {
      case 'error':
        console.error(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'info':
      case 'debug':
        console.log(formattedMessage);
        break;
    }
  }

  error(message: string, ...args: any[]): void {
    this.log('error', message, args);
  }

  warn(message: string, ...args: any[]): void {
    this.log('warn', message, args);
  }

  info(message: string, ...args: any[]): void {
    this.log('info', message, args);
  }

  debug(message: string, ...args: any[]): void {
    this.log('debug', message, args);
  }
} 