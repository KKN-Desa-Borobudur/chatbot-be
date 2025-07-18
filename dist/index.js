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
const dotenv_1 = __importDefault(require("dotenv"));
const body_parser_1 = __importDefault(require("body-parser"));
const axios_1 = __importDefault(require("axios"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY;
const SECRET = process.env.JWT_SECRET || 'your-secret';
const WORKSPACE_ID = process.env.DEFAULT_WORKSPACE_ID || 'default-workspace-id';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1d';
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
function generateSessionToken(workspaceId, threadId) {
    return jsonwebtoken_1.default.sign({ workspaceId, threadId }, SECRET, { expiresIn: JWT_EXPIRATION });
}
function verifySessionToken(token) {
    return jsonwebtoken_1.default.verify(token, SECRET);
}
app.post('/session', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const createThreadRes = yield axios_1.default.post(`${process.env.ANYTHINGLLM_URL}/api/v1/workspace/${WORKSPACE_ID}/thread/new`, {}, { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` } });
        const threadId = (_a = createThreadRes.data) === null || _a === void 0 ? void 0 : _a.thread.slug;
        if (!threadId)
            throw new Error('Thread creation failed');
        const token = generateSessionToken(WORKSPACE_ID, threadId);
        res.json({ token });
    }
    catch (err) {
        console.error('Error creating session:', err);
        res.status(500).json({ error: 'Failed to create session' });
    }
}));
app.post('/chat', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { message, token } = req.body;
    if (!message || !token)
        return res.status(400).json({ error: 'Missing message or token' });
    try {
        const payload = verifySessionToken(token);
        const { workspaceId, threadId } = payload;
        const llmResponse = yield axios_1.default.post(`${process.env.ANYTHINGLLM_URL}/api/v1/workspace/${workspaceId}/thread/${threadId}/chat`, {
            "message": message,
            "mode": "chat",
            "userId": 2,
            "reset": true
        }, { headers: { 'Content-Type': 'application/json', 'accept': 'application/json', 'Authorization': `Bearer ${API_KEY}` } });
        console.log(llmResponse.data);
        res.json({ response: llmResponse.data.textResponse });
    }
    catch (err) {
        console.error('Chat error:', err);
        res.status(500).json({ error: 'Chat failed or invalid token' });
    }
}));
app.post('/reset', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { token } = req.body;
    if (!token)
        return res.status(400).json({ error: 'Missing token' });
    try {
        const payload = verifySessionToken(token);
        const { workspaceId, threadId } = payload;
        yield axios_1.default.delete(`${process.env.ANYTHINGLLM_URL}/api/v1/workspace/${WORKSPACE_ID}/thread/${threadId}`, { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` } });
        const createThreadRes = yield axios_1.default.post(`${process.env.ANYTHINGLLM_URL}/api/v1/workspace/${WORKSPACE_ID}/thread/new`, {}, { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` } });
        const newThreadId = (_a = createThreadRes.data) === null || _a === void 0 ? void 0 : _a.thread.slug;
        if (!newThreadId)
            throw new Error('New thread creation failed');
        const newToken = generateSessionToken(workspaceId, newThreadId);
        res.json({ token: newToken });
    }
    catch (err) {
        console.error('Reset error:', err);
        res.status(500).json({ error: 'Reset failed or invalid token' });
    }
}));
app.listen(PORT, () => {
    console.log(`Chat backend is running on http://localhost:${PORT}`);
});
