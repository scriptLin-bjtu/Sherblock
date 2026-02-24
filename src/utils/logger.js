/**
 * Logger Utility - Intercepts console output and writes to file
 * Creates a new log file for each session
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

class Logger {
    constructor(options = {}) {
        this.logsDir = options.logsDir || path.join(process.cwd(), 'data', 'logs');
        this.logFile = null;
        this.writeStream = null;
        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info,
            debug: console.debug
        };
        this.enabled = false;
    }

    /**
     * Initialize logger - create log directory and file
     */
    async initialize() {
        try {
            // Ensure logs directory exists
            await fs.mkdir(this.logsDir, { recursive: true });

            // Generate log file name with timestamp
            const timestamp = this._formatTimestamp(new Date());
            this.logFile = path.join(this.logsDir, `session-${timestamp}.log`);

            // Create write stream
            this.writeStream = (await import('node:fs')).createWriteStream(
                this.logFile,
                { flags: 'a', encoding: 'utf8' }
            );

            // Intercept console methods
            this._interceptConsole();

            this.enabled = true;

            // Write session header
            this._writeToLog(
                `\n${'='.repeat(60)}\n` +
                `Session Started: ${new Date().toISOString()}\n` +
                `Platform: ${os.platform()} ${os.release()}\n` +
                `Node Version: ${process.version}\n` +
                `${'='.repeat(60)}\n`
            );

            return this.logFile;
        } catch (error) {
            console.error('Failed to initialize logger:', error.message);
            return null;
        }
    }

    /**
     * Intercept console methods to also write to log file
     */
    _interceptConsole() {
        const self = this;

        // Intercept console.log
        console.log = function(...args) {
            self.originalConsole.log(...args);
            if (self.enabled) {
                self._writeToLog('[LOG]', ...args);
            }
        };

        // Intercept console.error
        console.error = function(...args) {
            self.originalConsole.error(...args);
            if (self.enabled) {
                self._writeToLog('[ERROR]', ...args);
            }
        };

        // Intercept console.warn
        console.warn = function(...args) {
            self.originalConsole.warn(...args);
            if (self.enabled) {
                self._writeToLog('[WARN]', ...args);
            }
        };

        // Intercept console.info
        console.info = function(...args) {
            self.originalConsole.info(...args);
            if (self.enabled) {
                self._writeToLog('[INFO]', ...args);
            }
        };

        // Intercept console.debug
        console.debug = function(...args) {
            self.originalConsole.debug(...args);
            if (self.enabled) {
                self._writeToLog('[DEBUG]', ...args);
            }
        };
    }

    /**
     * Restore original console methods
     */
    _restoreConsole() {
        console.log = this.originalConsole.log;
        console.error = this.originalConsole.error;
        console.warn = this.originalConsole.warn;
        console.info = this.originalConsole.info;
        console.debug = this.originalConsole.debug;
    }

    /**
     * Write formatted log entry to file
     */
    _writeToLog(level, ...args) {
        if (!this.writeStream || this.writeStream.destroyed) return;

        const timestamp = new Date().toISOString();
        const message = args.map(arg => this._formatArgument(arg)).join(' ');
        const logEntry = `[${timestamp}] ${level} ${message}\n`;

        this.writeStream.write(logEntry);
    }

    /**
     * Format argument for log output
     */
    _formatArgument(arg) {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';

        switch (typeof arg) {
            case 'string':
                return arg;
            case 'number':
            case 'boolean':
                return String(arg);
            case 'object':
                try {
                    return JSON.stringify(arg, null, 2);
                } catch {
                    return '[Object]';
                }
            default:
                return String(arg);
        }
    }

    /**
     * Format timestamp for filename (YYYYMMDD-HHmmss)
     */
    _formatTimestamp(date) {
        const pad = (n) => String(n).padStart(2, '0');
        return (
            date.getFullYear() +
            pad(date.getMonth() + 1) +
            pad(date.getDate()) + '-' +
            pad(date.getHours()) +
            pad(date.getMinutes()) +
            pad(date.getSeconds())
        );
    }

    /**
     * Get current log file path
     */
    getLogFile() {
        return this.logFile;
    }

    /**
     * Close logger and restore console
     */
    async close() {
        if (this.writeStream && !this.writeStream.destroyed) {
            this._writeToLog(
                `\n${'='.repeat(60)}\n` +
                `Session Ended: ${new Date().toISOString()}\n` +
                `${'='.repeat(60)}\n`
            );

            await new Promise((resolve) => {
                this.writeStream.end(resolve);
            });
        }

        this._restoreConsole();
        this.enabled = false;
    }
}

// Export singleton instance
export const logger = new Logger();
