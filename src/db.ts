import DatabaseConstructor, { Database as DBType } from 'better-sqlite3';

interface threadRecord {
    id: number,
    workspaceId: string,
    threadId: string,
    createdAt: string
}

export function initDB(): DBType {
    const db = new DatabaseConstructor('./chat.sqlite', { verbose: console.log });
    return db;
}

export function createTables(db: DBType) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS chat_threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspaceId TEXT NOT NULL,
        threadId TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

export function addThread(db: DBType, workspaceId: string, threadId: string) {
    const stmt = db.prepare(`INSERT INTO chat_threads (workspaceId, threadId) VALUES (?, ?)`);
    const info = stmt.run(workspaceId, threadId);
}

export function getOldThreads(db: DBType, ttlHours: number) : [threadRecord] {
    const stmt = db.prepare(`SELECT * FROM chat_threads WHERE createdAt <= datetime('now', ?)`)
    const result = stmt.all(`-${ttlHours} hours`);
    return result as [threadRecord];
}

export function deleteThreadRecord(db: DBType, threadId: string) {
    const stmt = db.prepare(`DELETE FROM chat_threads WHERE threadId = ?`);
    const info = stmt.run(threadId);
}
