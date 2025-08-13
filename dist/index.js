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
const axios_1 = __importDefault(require("axios"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("./env");
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
app.post('/session', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const createThreadRes = yield axios_1.default.post(`${ANYTHINGLLM_URL}/api/v1/workspace/${DEFAULT_WORKSPACE_ID}/thread/new`, {}, { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` } });
        const threadId = (_a = createThreadRes.data) === null || _a === void 0 ? void 0 : _a.thread.slug;
        if (!threadId)
            throw new Error('Thread creation failed');
        // create first message
        yield axios_1.default.post(`${ANYTHINGLLM_URL}/api/v1/workspace/${DEFAULT_WORKSPACE_ID}/thread/${threadId}/chat`, {
            "message": "Halo",
            "mode": "chat",
            "userId": 2,
            "reset": false
        }, { headers: { 'Content-Type': 'application/json', 'accept': 'application/json', 'Authorization': `Bearer ${API_KEY}` } });
        (0, db_1.addThread)(db, DEFAULT_WORKSPACE_ID, threadId);
        const token = generateSessionToken(DEFAULT_WORKSPACE_ID, threadId);
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
        const llmResponse = yield axios_1.default.post(`${ANYTHINGLLM_URL}/api/v1/workspace/${workspaceId}/thread/${threadId}/chat`, {
            "message": message,
            "mode": "chat",
            "userId": 2,
            "reset": false
        }, { headers: { 'Content-Type': 'application/json', 'accept': 'application/json', 'Authorization': `Bearer ${API_KEY}` } });
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
    const { workspaceId, threadId } = verifySessionToken(token);
    const response = yield axios_1.default.get(`${ANYTHINGLLM_URL}/api/v1/workspace/${workspaceId}/thread/${threadId}/chats`, { headers: { 'Content-Type': 'application/json', 'accept': 'application/json', 'Authorization': `Bearer ${API_KEY}` } });
    const data = response.data;
    const history = data.history.map((item) => {
        const { role, content, sentAt, chatId } = item;
        return { role, content, sentAt, chatId };
    });
    res.json({ history });
}));
app.post('/reset', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (!token)
        return res.status(400).json({ error: 'Missing token' });
    try {
        const payload = verifySessionToken(token);
        const { workspaceId, threadId } = payload;
        const response = yield axios_1.default.delete(`${ANYTHINGLLM_URL}/api/v1/workspace/${workspaceId}/thread/${threadId}`, { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` } });
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
