/**
 * Conversation Logger - 记录工作区中的用户与Agent对话
 *
 * 在工作区的 logs 目录创建对话日志文件，记录完整的交互过程
 */

import { open } from 'fs/promises';
import { join } from 'path';
import { workspaceManager } from './workspace-manager.js';

/**
 * Conversation Logger 类
 */
class ConversationLogger {
    constructor() {
        this.fileHandle = null;
        this.workspaceId = null;
        this.logFilePath = null;
    }

    /**
     * 初始化对话日志
     * @param {string} workspaceId - 工作区ID
     */
    async initialize(workspaceId) {
        this.workspaceId = workspaceId;

        // 获取日志目录路径
        const logsPath = workspaceManager.getLogsPath
            ? workspaceManager.getLogsPath()
            : join(process.cwd(), 'data', workspaceId, 'logs');

        // 生成日志文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        this.logFilePath = join(logsPath, `conversation-${timestamp}.log`);

        // 创建并打开日志文件
        this.fileHandle = await open(this.logFilePath, 'a');

        // 写入开始标记
        await this._writeLine('='.repeat(60));
        await this._writeLine(`对话日志开始 - ${new Date().toLocaleString('zh-CN')}`);
        await this._writeLine(`工作区: ${workspaceId}`);
        await this._writeLine('='.repeat(60));
        await this._writeLine('');

        console.log(`[ConversationLogger] Initialized: ${this.logFilePath}`);
    }

    /**
     * 记录用户消息
     * @param {string} message - 用户消息内容
     */
    async logUserMessage(message) {
        await this._writeLine(`[${this._getTimestamp()}] [用户]`);
        await this._writeLine(message);
        await this._writeLine('');
    }

    /**
     * 记录Agent消息
     * @param {string} agentName - Agent名称（如 QuestionAgent、ExecuteAgent）
     * @param {string} message - Agent消息内容
     * @param {string} stage - 阶段（可选）
     */
    async logAgentMessage(agentName, message, stage = null) {
        const stageInfo = stage ? ` [${stage}]` : '';
        await this._writeLine(`[${this._getTimestamp()}] [${agentName}]${stageInfo}`);
        await this._writeLine(message);
        await this._writeLine('');
    }

    /**
     * 记录系统消息
     * @param {string} message - 系统消息内容
     */
    async logSystemMessage(message) {
        await this._writeLine(`[${this._getTimestamp()}] [系统]`);
        await this._writeLine(message);
        await this._writeLine('');
    }

    /**
     * 记录阶段变更
     * @param {string} stage - 阶段名称
     */
    async logStageChange(stage) {
        await this._writeLine('-'.repeat(40));
        await this._writeLine(`[${this._getTimestamp()}] 阶段变更: ${stage}`);
        await this._writeLine('-'.repeat(40));
        await this._writeLine('');
    }

    /**
     * 关闭日志文件
     */
    async close() {
        if (this.fileHandle) {
            await this._writeLine('');
            await this._writeLine('='.repeat(60));
            await this._writeLine(`对话日志结束 - ${new Date().toLocaleString('zh-CN')}`);
            await this._writeLine('='.repeat(60));

            await this.fileHandle.close();
            this.fileHandle = null;

            console.log('[ConversationLogger] Closed');
        }
    }

    /**
     * 获取时间戳
     * @private
     */
    _getTimestamp() {
        return new Date().toISOString();
    }

    /**
     * 写入一行到日志文件
     * @private
     * @param {string} line - 要写入的内容
     */
    async _writeLine(line) {
        if (this.fileHandle) {
            await this.fileHandle.write(line + '\n');
        }
    }
}

// 导出单例
export const conversationLogger = new ConversationLogger();
export default conversationLogger;