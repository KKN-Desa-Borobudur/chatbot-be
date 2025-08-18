import axios from 'axios';
import { initDB, createTables, addThread, deleteThreadRecord, getOldThreads } from './db';
import { ENV } from './env';

const { ANYTHINGLLM_URL, API_KEY, JWT_EXPIRATION } = ENV;

// Convert TOKEN_EXPIRATION (e.g., "5s", "5d") to milliseconds
function parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error(`Invalid duration format: ${duration}`);
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: throw new Error(`Unknown duration unit: ${unit}`);
    }
}

(async () => {
    const db = initDB();

    const expirationMs = parseDuration(JWT_EXPIRATION);
    const oldThreads = getOldThreads(db, expirationMs);
    console.log(expirationMs)
    for (const t of oldThreads) {
        await axios.delete(
            `${ANYTHINGLLM_URL}/api/v1/workspace/${t.workspaceId}/thread/${t.threadId}`,
            {
                headers: { Authorization: `Bearer ${API_KEY}` }
            }
        );
        deleteThreadRecord(db, t.threadId);
        console.log(t.threadId, 'deleted');
    }

    console.log('Cleanup done.');
})();
