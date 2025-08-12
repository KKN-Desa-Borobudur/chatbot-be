"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDB = initDB;
exports.createTables = createTables;
exports.addThread = addThread;
exports.getOldThreads = getOldThreads;
exports.deleteThreadRecord = deleteThreadRecord;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
function initDB() {
    const db = new better_sqlite3_1.default('./chat.sqlite', { verbose: console.log });
    return db;
}
function createTables(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS chat_threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspaceId TEXT NOT NULL,
        threadId TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
}
function addThread(db, workspaceId, threadId) {
    const stmt = db.prepare(`INSERT INTO chat_threads (workspaceId, threadId) VALUES (?, ?)`);
    const info = stmt.run(workspaceId, threadId);
}
function getOldThreads(db, ttlHours) {
    const stmt = db.prepare(`SELECT * FROM chat_threads WHERE createdAt <= datetime('now', ?)`);
    const result = stmt.all(`-${ttlHours} hours`);
    return result;
}
function deleteThreadRecord(db, threadId) {
    const stmt = db.prepare(`DELETE FROM chat_threads WHERE threadId = ?`);
    const info = stmt.run(threadId);
}
