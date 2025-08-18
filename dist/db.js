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
        createdAt INTEGER NOT NULL
        );
    `);
}
function addThread(db, workspaceId, threadId) {
    const stmt = db.prepare(`INSERT INTO chat_threads (workspaceId, threadId, createdAt) VALUES (?, ?, ?)`);
    const info = stmt.run(workspaceId, threadId, Date.now());
}
function getOldThreads(db, ttlMs) {
    const cutoff = Date.now() - ttlMs;
    const stmt = db.prepare(`SELECT * FROM chat_threads WHERE createdAt <= ?`);
    return stmt.all(cutoff);
}
function deleteThreadRecord(db, threadId) {
    const stmt = db.prepare(`DELETE FROM chat_threads WHERE threadId = ?`);
    const info = stmt.run(threadId);
}
