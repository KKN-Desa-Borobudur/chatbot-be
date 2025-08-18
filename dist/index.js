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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("./env");
const api_1 = __importDefault(require("./api"));
const db_1 = require("./db");
const app = (0, express_1.default)();
const { ANYTHINGLLM_URL, API_KEY, PORT, JWT_SECRET, JWT_EXPIRATION, DEFAULT_WORKSPACE_ID } = env_1.ENV;
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
let db = (0, db_1.initDB)();
(0, db_1.createTables)(db);
function generateSessionToken(workspaceId, threadId) {
    return jsonwebtoken_1.default.sign({ workspaceId, threadId }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}
function verifySessionToken(token) {
    const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
    if (typeof decoded === 'string' || !decoded) {
        throw new Error('Invalid token payload');
    }
    return decoded;
}
function createNewThread() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const createThreadRes = yield api_1.default.post(`/api/v1/workspace/${DEFAULT_WORKSPACE_ID}/thread/new`, {});
        // check if the thread is created successfully
        if (!createThreadRes.data || !createThreadRes.data.thread || !createThreadRes.data.thread.slug) {
            throw new Error('Failed to create thread');
        }
        const threadId = (_a = createThreadRes.data) === null || _a === void 0 ? void 0 : _a.thread.slug;
        yield api_1.default.post(`/api/v1/workspace/${DEFAULT_WORKSPACE_ID}/thread/${threadId}/chat`, {
            "message": "Halo",
            "mode": "chat",
            "userId": 2,
            "reset": false
        });
        (0, db_1.addThread)(db, DEFAULT_WORKSPACE_ID, threadId);
        const token = generateSessionToken(DEFAULT_WORKSPACE_ID, threadId);
        return token;
    });
}
app.post('/session', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        let token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        // if the token is not existed, create a new thread
        if (!token) {
            token = yield createNewThread();
            res.json({ token });
            return;
        }
        let payload;
        if (token) {
            try {
                payload = verifySessionToken(token);
            }
            catch (err) {
                token = yield createNewThread();
                res.json({ token });
                return;
            }
            res.json({ token });
            return;
        }
        res.json({ token });
    }
    catch (err) {
        console.error('Error creating session:', err);
        res.status(500).json({ error: 'Failed to create session' });
    }
}));
app.post('/chat', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    const { message } = req.body;
    if (!message || !token)
        return res.status(400).json({ error: 'Missing message or token' });
    try {
        const payload = verifySessionToken(token);
        const { workspaceId, threadId } = payload;
        const llmResponse = yield api_1.default.post(`/api/v1/workspace/${workspaceId}/thread/${threadId}/chat`, {
            "message": message,
            "mode": "chat",
            "userId": 2,
            "reset": false
        });
        res.json({ response: llmResponse.data.textResponse });
    }
    catch (err) {
        console.error('Chat error:', err);
        res.status(500).json({ error: 'Chat failed or invalid token' });
    }
}));
app.get('/history', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (!token)
        return res.status(400).json({ error: 'Missing token' });
    try {
        const { workspaceId, threadId } = verifySessionToken(token);
        const response = yield api_1.default.get(`${ANYTHINGLLM_URL}/api/v1/workspace/${workspaceId}/thread/${threadId}/chats`);
        const data = response.data;
        const history = data.history.map((item) => {
            const { role, content, sentAt, chatId } = item;
            return { role, content, sentAt, chatId };
        });
        res.json({ history });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch history or invalid token' });
        console.error('History fetch error:', err);
    }
}));
app.post('/reset', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (!token)
        return res.status(400).json({ error: 'Missing token' });
    try {
        const payload = verifySessionToken(token);
        const { workspaceId, threadId } = payload;
        const response = yield api_1.default.delete(`/api/v1/workspace/${workspaceId}/thread/${threadId}`);
        if (!response)
            throw new Error('Thread deletion failed');
        (0, db_1.deleteThreadRecord)(db, threadId);
        res.json({ message: 'Thread deleted successfully' });
    }
    catch (err) {
        console.error('Reset error:', err);
        res.status(500).json({ error: 'Reset failed or invalid token' });
    }
}));
app.listen(PORT, () => {
    console.log(`Chat backend is running on http://localhost:${PORT}`);
});
