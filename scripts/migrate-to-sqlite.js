/**
 * 数据迁移脚本：将现有文件系统数据导入 SQLite 数据库
 *
 * 用法：node scripts/migrate-to-sqlite.js
 *
 * 扫描 data/ 目录下的 workspace-* 目录，将：
 * - workspace 元数据 → workspaces 表
 * - scope.json → scope_entries 表
 * - logs/workflow.json → workflow_logs 表
 * - charts/*.svg → artifacts 表
 * - reports/*.md → artifacts 表
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { Database } from '../src/db/database.js';

async function migrate() {
    console.log('=== SQLite Migration Script ===\n');

    const db = Database.getInstance();
    await db.open();
    const rawDb = db.getDb();

    const dataDir = join(process.cwd(), 'data');
    let entries;

    try {
        entries = await readdir(dataDir, { withFileTypes: true });
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('No data/ directory found. Nothing to migrate.');
            db.close();
            return;
        }
        throw error;
    }

    const workspaceDirs = entries.filter(
        e => e.isDirectory() && e.name.startsWith('workspace-')
    );

    if (workspaceDirs.length === 0) {
        console.log('No workspace directories found. Nothing to migrate.');
        db.close();
        return;
    }

    console.log(`Found ${workspaceDirs.length} workspace(s) to migrate.\n`);

    let totalWorkspaces = 0;
    let totalScopeEntries = 0;
    let totalLogEntries = 0;
    let totalArtifacts = 0;

    for (const dir of workspaceDirs) {
        const workspaceId = dir.name;
        const workspacePath = join(dataDir, dir.name);

        console.log(`Migrating: ${workspaceId}`);

        try {
            // 1. Workspace metadata
            const dirStats = await stat(workspacePath);
            let title = workspaceId;
            let scope = null;

            // Read scope.json for title
            try {
                const scopeContent = await readFile(join(workspacePath, 'scope.json'), 'utf-8');
                scope = JSON.parse(scopeContent);
                title = scope?.basic_infos?.user_questions?.[0] ||
                    scope?.basic_infos?.goal || workspaceId;
            } catch {
                // scope.json may not exist
            }

            rawDb.prepare(`
                INSERT OR IGNORE INTO workspaces (id, title, status, created_at, updated_at)
                VALUES (?, ?, 'idle', ?, ?)
            `).run(
                workspaceId,
                title,
                dirStats.birthtime.toISOString(),
                dirStats.mtime.toISOString()
            );
            totalWorkspaces++;

            // 2. Scope entries
            if (scope) {
                for (const [key, value] of Object.entries(scope)) {
                    rawDb.prepare(`
                        INSERT OR IGNORE INTO scope_entries (workspace_id, scope_key, scope_value)
                        VALUES (?, ?, ?)
                    `).run(workspaceId, key, JSON.stringify(value));
                    totalScopeEntries++;
                }
            }

            // 3. Workflow logs
            try {
                const logContent = await readFile(join(workspacePath, 'logs', 'workflow.json'), 'utf-8');
                const logs = JSON.parse(logContent);

                for (const entry of logs) {
                    const { type, role, agent, content, timestamp, ...rest } = entry;
                    rawDb.prepare(`
                        INSERT INTO workflow_logs (workspace_id, entry_type, role, agent, content, entry_data, timestamp)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        workspaceId,
                        type || 'unknown',
                        role || null,
                        agent || null,
                        typeof content === 'string' ? content : (content ? JSON.stringify(content) : null),
                        Object.keys(rest).length > 0 ? JSON.stringify(rest) : null,
                        timestamp || new Date().toISOString()
                    );
                    totalLogEntries++;
                }
            } catch {
                // workflow.json may not exist or be invalid
            }

            // 4. Chart artifacts
            try {
                const chartsDir = join(workspacePath, 'charts');
                const chartFiles = await readdir(chartsDir);
                for (const file of chartFiles) {
                    if (file.endsWith('.svg')) {
                        const filePath = join(chartsDir, file);
                        const fileStats = await stat(filePath);
                        rawDb.prepare(`
                            INSERT INTO artifacts (workspace_id, artifact_type, filename, file_path, title, file_size)
                            VALUES (?, 'chart', ?, ?, ?, ?)
                        `).run(workspaceId, file, filePath, file.replace('.svg', ''), fileStats.size);
                        totalArtifacts++;
                    }
                }
            } catch {
                // charts dir may not exist
            }

            // 5. Report artifacts
            try {
                const reportsDir = join(workspacePath, 'reports');
                const reportFiles = await readdir(reportsDir);
                for (const file of reportFiles) {
                    if (file.endsWith('.md')) {
                        const filePath = join(reportsDir, file);
                        const fileStats = await stat(filePath);
                        rawDb.prepare(`
                            INSERT INTO artifacts (workspace_id, artifact_type, filename, file_path, title, file_size)
                            VALUES (?, 'report', ?, ?, ?, ?)
                        `).run(workspaceId, file, filePath, file.replace('.md', ''), fileStats.size);
                        totalArtifacts++;
                    }
                }
            } catch {
                // reports dir may not exist
            }

            console.log(`  ✓ Done`);

        } catch (error) {
            console.error(`  ✗ Error: ${error.message}`);
        }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Workspaces:    ${totalWorkspaces}`);
    console.log(`Scope entries: ${totalScopeEntries}`);
    console.log(`Log entries:   ${totalLogEntries}`);
    console.log(`Artifacts:     ${totalArtifacts}`);

    db.close();
    console.log('\nMigration complete!');
}

migrate().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
});
