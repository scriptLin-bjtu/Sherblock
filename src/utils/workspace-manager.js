/**
 * Workspace Manager - Manages task-specific workspace directories
 *
 * Creates a unique workspace directory for each task execution to isolate
 * task files (scope, logs, charts, reports) from each other.
 */

import { mkdir } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';

/**
 * Workspace Manager Singleton
 */
export class WorkspaceManager {
    constructor() {
        this.workspaceId = null;
        this.workspacePath = null;
        this.initialized = false;
    }

    /**
     * Generate a unique workspace ID
     * Format: workspace-YYYYMMDD-HHmmss-{6chars}
     */
    _generateWorkspaceId() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const timestamp = (
            now.getFullYear() +
            pad(now.getMonth() + 1) +
            pad(now.getDate()) + '-' +
            pad(now.getHours()) +
            pad(now.getMinutes()) +
            pad(now.getSeconds())
        );
        const randomSuffix = randomBytes(3).toString('hex').toLowerCase();
        return `workspace-${timestamp}-${randomSuffix}`;
    }

    /**
     * Initialize workspace - generate ID and create directory structure
     * If already initialized with a workspaceId, this will ensure directories exist
     */
    async initialize(workspaceId = null) {
        // If already initialized with a workspaceId, just ensure directories exist
        if (this.initialized && this.workspaceId) {
            await mkdir(this.workspacePath, { recursive: true });
            await mkdir(join(this.workspacePath, 'logs'), { recursive: true });
            await mkdir(join(this.workspacePath, 'charts'), { recursive: true });
            await mkdir(join(this.workspacePath, 'reports'), { recursive: true });
            return;
        }

        // If workspaceId is provided, use it; otherwise generate a new one
        if (workspaceId) {
            this.workspaceId = workspaceId;
        } else {
            this.workspaceId = this._generateWorkspaceId();
        }

        try {
            // Set workspace path
            this.workspacePath = join(process.cwd(), 'data', this.workspaceId);

            // Create workspace directory structure
            await mkdir(this.workspacePath, { recursive: true });
            await mkdir(join(this.workspacePath, 'logs'), { recursive: true });
            await mkdir(join(this.workspacePath, 'charts'), { recursive: true });
            await mkdir(join(this.workspacePath, 'reports'), { recursive: true });

            this.initialized = true;
            console.log(`[WorkspaceManager] Initialized workspace: ${this.workspaceId}`);
        } catch (error) {
            console.error('[WorkspaceManager] Failed to initialize workspace:', error.message);
            throw error;
        }
    }

    /**
     * Get workspace ID
     */
    getWorkspaceId() {
        return this.workspaceId;
    }

    /**
     * Get workspace root path
     */
    getWorkspacePath() {
        return this.workspacePath;
    }

    /**
     * Get scope.json file path
     */
    getScopePath() {
        if (!this.workspacePath) {
            throw new Error('Workspace not initialized');
        }
        return this.workspacePath;
    }

    /**
     * Get charts directory path
     */
    getChartsPath() {
        if (!this.workspacePath) {
            throw new Error('Workspace not initialized');
        }
        return join(this.workspacePath, 'charts');
    }

    /**
     * Get reports directory path
     */
    getReportsPath() {
        if (!this.workspacePath) {
            throw new Error('Workspace not initialized');
        }
        return join(this.workspacePath, 'reports');
    }

    /**
     * Get logs directory path
     */
    getLogsPath() {
        if (!this.workspacePath) {
            throw new Error('Workspace not initialized');
        }
        return join(this.workspacePath, 'logs');
    }

    /**
     * Check if workspace is initialized
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Set workspace ID directly (for using existing workspace)
     */
    async setWorkspaceId(workspaceId) {
        this.workspaceId = workspaceId;
        this.workspacePath = join(process.cwd(), 'data', this.workspaceId);

        // 确保目录存在
        await mkdir(this.workspacePath, { recursive: true });
        await mkdir(join(this.workspacePath, 'logs'), { recursive: true });
        await mkdir(join(this.workspacePath, 'charts'), { recursive: true });
        await mkdir(join(this.workspacePath, 'reports'), { recursive: true });

        this.initialized = true;
        console.log(`[WorkspaceManager] Set workspace: ${this.workspaceId}`);
    }

    /**
     * Reset workspace (for testing purposes)
     */
    async reset() {
        this.workspaceId = null;
        this.workspacePath = null;
        this.initialized = false;
    }
}

// Export singleton instance
export const workspaceManager = new WorkspaceManager();
