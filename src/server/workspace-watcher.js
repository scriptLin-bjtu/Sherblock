/**
 * Workspace Watcher - 监听工作区文件变化
 */
import { watch } from 'chokidar';
import { join, sep } from 'path';

export class WorkspaceWatcher {
    constructor(wsServer, messageHandler) {
        this.wsServer = wsServer;
        this.messageHandler = messageHandler;
        this.watcher = null;
        this.debounceTimers = new Map();
    }

    /**
     * 启动文件监听
     */
    start() {
        const dataDir = join(process.cwd(), 'data');
        console.log(`[WorkspaceWatcher] Starting watcher on: ${dataDir}`);

        this.watcher = watch(dataDir, {
            ignored: /(^|[\/\\])\../, // 忽略隐藏文件
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 500,
                pollInterval: 100
            }
        });

        this.watcher
            .on('add', (path) => this.handleFileChange('add', path))
            .on('change', (path) => this.handleFileChange('change', path))
            .on('unlink', (path) => this.handleFileChange('unlink', path))
            .on('addDir', (path) => this.handleDirChange('add', path))
            .on('unlinkDir', (path) => this.handleDirChange('unlink', path))
            .on('error', (error) => console.error('[WorkspaceWatcher] Error:', error))
            .on('ready', () => console.log('[WorkspaceWatcher] Watcher ready'));
    }

    /**
     * 处理文件变化
     */
    handleFileChange(event, filePath) {
        // 防抖处理
        const debounceKey = `${event}:${filePath}`;
        if (this.debounceTimers.has(debounceKey)) {
            clearTimeout(this.debounceTimers.get(debounceKey));
        }

        const timer = setTimeout(() => {
            this.debounceTimers.delete(debounceKey);
            this.processFileChange(event, filePath);
        }, 200);

        this.debounceTimers.set(debounceKey, timer);
    }

    /**
     * 处理目录变化
     */
    handleDirChange(event, dirPath) {
        const debounceKey = `${event}:dir:${dirPath}`;
        if (this.debounceTimers.has(debounceKey)) {
            clearTimeout(this.debounceTimers.get(debounceKey));
        }

        const timer = setTimeout(async () => {
            this.debounceTimers.delete(debounceKey);
            await this.processDirChange(event, dirPath);
        }, 200);

        this.debounceTimers.set(debounceKey, timer);
    }

    /**
     * 处理文件变化并发送通知
     */
    processFileChange(event, filePath) {
        const parts = filePath.split(/[\/\\]/);
        const dataIndex = parts.indexOf('data');

        if (dataIndex === -1 || !parts[dataIndex + 1]) {
            return;
        }

        const workspaceId = parts[dataIndex + 1];

        // 检查是否是workspace目录
        if (!workspaceId.startsWith('workspace-')) {
            return;
        }

        let fileType = null;
        let filename = null;

        if (parts.length > dataIndex + 2) {
            const thirdPart = parts[dataIndex + 2];
            // 检查是否是根目录文件 (scope.json, workflow.json 等)
            if (thirdPart && (thirdPart.endsWith('.json') || thirdPart.endsWith('.md'))) {
                filename = thirdPart;
                // 根目录文件，fileType 为 null
            } else {
                fileType = thirdPart; // charts, reports, logs
                filename = parts[dataIndex + 3];
            }
        }

        // 构建文件信息
        const fileInfo = {
            workspaceId,
            event,
            fileType,
            filename,
            path: filePath,
            timestamp: Date.now()
        };

        // 专门处理 workflow.json 变化 (可能在 logs 目录或根目录)
        if (filename === 'workflow.json') {
            this.wsServer.broadcast('WORKFLOW_LOG_UPDATED', {
                workspaceId,
                event,
                fileType,
                filename: 'workflow.json',
                path: filePath,
                timestamp: Date.now()
            }, workspaceId);
            // 继续广播 FILE_CHANGED 以触发前端刷新
        }

        // 根目录文件也广播
        if (!fileType && filename) {
            this.wsServer.broadcast('FILE_CHANGED', fileInfo, workspaceId);
        }

        // 广播文件变化消息
        this.wsServer.broadcast('FILE_CHANGED', fileInfo, workspaceId);
    }

    /**
     * 处理目录变化并发送通知
     */
    async processDirChange(event, dirPath) {
        const parts = dirPath.split(/[\/\\]/);
        const dataIndex = parts.indexOf('data');

        if (dataIndex === -1 || !parts[dataIndex + 1]) {
            return;
        }

        const workspaceId = parts[dataIndex + 1];

        // 检查是否是workspace目录
        if (!workspaceId.startsWith('workspace-')) {
            return;
        }

        let fileType = null;
        if (parts.length > dataIndex + 2) {
            fileType = parts[dataIndex + 2];
        }

        console.log(`[WorkspaceWatcher] Dir ${event}: ${dirPath}`);

        const dirInfo = {
            workspaceId,
            event,
            fileType,
            path: dirPath,
            timestamp: Date.now()
        };

        // 广播目录变化消息
        this.wsServer.broadcast('DIR_CHANGED', dirInfo, workspaceId);

        // 如果是新建工作区，广播完整的工作区列表
        if (event === 'add' && !fileType) {
            const workspaces = await this.messageHandler.listWorkspaces();
            this.wsServer.broadcast('WORKSPACES_LIST', { workspaces });
        }
    }

    /**
     * 停止文件监听
     */
    stop() {
        if (this.watcher) {
            // 清除所有定时器
            for (const timer of this.debounceTimers.values()) {
                clearTimeout(timer);
            }
            this.debounceTimers.clear();

            this.watcher.close();
            this.watcher = null;
            console.log('[WorkspaceWatcher] Watcher stopped');
        }
    }

    /**
     * 获取监听状态
     */
    isWatching() {
        return this.watcher !== null;
    }
}

export default WorkspaceWatcher;