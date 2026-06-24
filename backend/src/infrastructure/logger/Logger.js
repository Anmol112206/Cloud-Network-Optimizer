/**
 * Logger
 * Centralized logging utility
 */
class Logger {
  constructor(name) {
    this.name = name;
    this.level = process.env.LOG_LEVEL || 'info';
  }

  info(message, metadata = {}) {
    this._log('INFO', message, metadata);
  }

  error(message, metadata = {}) {
    this._log('ERROR', message, metadata);
  }

  warn(message, metadata = {}) {
    this._log('WARN', message, metadata);
  }

  debug(message, metadata = {}) {
    if (this.level === 'debug') {
      this._log('DEBUG', message, metadata);
    }
  }

  _log(level, message, metadata) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      logger: this.name,
      message,
      ...metadata
    };

    if (level === 'ERROR') {
      console.error(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }
}

module.exports = Logger;
