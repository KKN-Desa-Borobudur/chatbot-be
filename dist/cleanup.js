"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const db_1 = require("./db");
const env_1 = require("./env");
const { ANYTHINGLLM_URL, API_KEY, JWT_EXPIRATION } = env_1.ENV;
// Convert TOKEN_EXPIRATION (e.g., "5s", "5d") to milliseconds
function parseDuration(duration) {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match)
        throw new Error(`Invalid duration format: ${duration}`);
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
(() => __awaiter(void 0, void 0, void 0, function* () {
    const db = (0, db_1.initDB)();
    const expirationMs = parseDuration(JWT_EXPIRATION);
    const oldThreads = (0, db_1.getOldThreads)(db, expirationMs);
    console.log(expirationMs);
    for (const t of oldThreads) {
        yield axios_1.default.delete(`${ANYTHINGLLM_URL}/api/v1/workspace/${t.workspaceId}/thread/${t.threadId}`, {
            headers: { Authorization: `Bearer ${API_KEY}` }
        });
        (0, db_1.deleteThreadRecord)(db, t.threadId);
        console.log(t.threadId, 'deleted');
    }
    console.log('Cleanup done.');
}))();
