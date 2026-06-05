/**
 * Logger Utility - Intercepts console output and forwards it to SQLite
 * (LogRepository.session_logs). No file is created — the previous
 * session-*.log files are gone.
 */

import { workspaceManager } from './workspace-manager.js';
import { LogRepository } from '../db/log-repository.js';

class Logger {
    constructor() {
        this.logRepo = null;
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
     * Initialize logger - bind to current workspace's LogRepository and
     * start forwarding console output. Returns a human-readable sink id.
     */
    async initialize() {
        try {
            if (!workspaceManager.isInitialized()) {
                return null;
            }
            const workspaceId = workspaceManager.getWorkspaceId();
            this.logRepo = new LogRepository(workspaceId);

            this._interceptConsole();
            this.enabled = true;

            this._writeToDb('LOG',
                `===== Session Started: ${new Date().toISOString()} =====`);

            return `sqlite:session_logs?workspace=${workspaceId}`;
        } catch (error) {
            this.originalConsole.error('Failed to initialize logger:', error.message);
            return null;
        }
    }

    _interceptConsole() {
        const self = this;

        console.log = function (...args) {
            self.originalConsole.log(...args);
            if (self.enabled) self._writeToDb('LOG', ...args);
        };
        console.error = function (...args) {
            self.originalConsole.error(...args);
            if (self.enabled) self._writeToDb('ERROR', ...args);
        };
        console.warn = function (...args) {
            self.originalConsole.warn(...args);
            if (self.enabled) self._writeToDb('WARN', ...args);
        };
        console.info = function (...args) {
            self.originalConsole.info(...args);
            if (self.enabled) self._writeToDb('INFO', ...args);
        };
        console.debug = function (...args) {
            self.originalConsole.debug(...args);
            if (self.enabled) self._writeToDb('DEBUG', ...args);
        };
    }

    _restoreConsole() {
        console.log = this.originalConsole.log;
        console.error = this.originalConsole.error;
        console.warn = this.originalConsole.warn;
        console.info = this.originalConsole.info;
        console.debug = this.originalConsole.debug;
    }

    _writeToDb(level, ...args) {
        if (!this.logRepo) return;
        try {
            const message = args.map(arg => this._formatArgument(arg)).join(' ');
            // logToSession is fixed to 'LOG' level; encode level inline
            this.logRepo.logToSession(`[${new Date().toISOString()}] [${level}] ${message}`);
        } catch {
            // never throw from console interceptor
        }
    }

    _formatArgument(arg) {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        switch (typeof arg) {
            case 'string': return arg;
            case 'number':
            case 'boolean': return String(arg);
            case 'object':
                try { return JSON.stringify(arg); } catch { return '[Object]'; }
            default: return String(arg);
        }
    }

    /**
     * Compatibility shim - returns the SQLite sink id, not a filesystem path.
     */
    getLogFile() {
        if (!this.logRepo) return null;
        return `sqlite:session_logs?workspace=${workspaceManager.getWorkspaceId()}`;
    }

    async close() {
        if (this.enabled) {
            this._writeToDb('LOG',
                `===== Session Ended: ${new Date().toISOString()} =====`);
        }
        this._restoreConsole();
        this.enabled = false;
    }
}

export const logger = new Logger();
