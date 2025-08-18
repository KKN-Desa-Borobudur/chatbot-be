import DatabaseConstructor, { Database as DBType } from 'better-sqlite3';

interface ThreadRecord {
    id: number,
    workspaceId: string,
    threadId: string,
    createdAt: number
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
        createdAt INTEGER NOT NULL
        );
    `);
}

export function addThread(db: DBType, workspaceId: string, threadId: string) {
    const stmt = db.prepare(`INSERT INTO chat_threads (workspaceId, threadId, createdAt) VALUES (?, ?, ?)`);
    const info = stmt.run(workspaceId, threadId, Date.now());
}

export function getOldThreads(db: DBType, ttlMs: number) : ThreadRecord[] {
    const cutoff = Date.now() - ttlMs;
    const stmt = db.prepare(`SELECT * FROM chat_threads WHERE createdAt <= ?`);
    return stmt.all(cutoff) as ThreadRecord[];
}

export function deleteThreadRecord(db: DBType, threadId: string) {
    const stmt = db.prepare(`DELETE FROM chat_threads WHERE threadId = ?`);
    const info = stmt.run(threadId);
}
