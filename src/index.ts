import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import ms from 'ms';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY;
const SECRET: string = process.env.JWT_SECRET || 'your-secret';
const WORKSPACE_ID = process.env.DEFAULT_WORKSPACE_ID || 'default-workspace-id';
const JWT_EXPIRATION: ms.StringValue = (process.env.JWT_EXPIRATION as ms.StringValue) || '1d';

app.use(cors());
app.use(bodyParser.json());

function generateSessionToken(workspaceId: string, threadId: string): string {
    return jwt.sign({ workspaceId, threadId }, SECRET, { expiresIn: JWT_EXPIRATION });
}

function verifySessionToken(token: string): any {
    return jwt.verify(token, SECRET);
}

app.post('/session', async (req, res) => {
    try {
        const createThreadRes = await axios.post(
            `${process.env.ANYTHINGLLM_URL}/api/v1/workspace/${WORKSPACE_ID}/thread/new`,
            { },
            { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` } }
        );

        const threadId = createThreadRes.data?.thread.slug;
        if (!threadId) throw new Error('Thread creation failed');

        const token = generateSessionToken(WORKSPACE_ID, threadId);
        res.json({ token });
    } catch (err) {
        console.error('Error creating session:', err);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

app.post('/chat', async (req, res) => {
    const { message, token } = req.body;
    if (!message || !token) return res.status(400).json({ error: 'Missing message or token' });

    try {
        const payload = verifySessionToken(token);
        const { workspaceId, threadId } = payload;

        const llmResponse = await axios.post(
            `${process.env.ANYTHINGLLM_URL}/api/v1/workspace/${workspaceId}/thread/${threadId}/chat`,
            {
                "message": message,
                "mode": "chat",
                "userId": 2,
                "reset": true
            },
            { headers: { 'Content-Type': 'application/json', 'accept': 'application/json', 'Authorization': `Bearer ${API_KEY}` } }
        );

        console.log(llmResponse.data)
        res.json({ response: llmResponse.data.textResponse });
    } catch (err) {
        console.error('Chat error:', err);
        res.status(500).json({ error: 'Chat failed or invalid token' });
    }
});

app.post('/reset', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Missing token' });

    try {
        const payload = verifySessionToken(token);
        const { workspaceId, threadId } = payload;

        await axios.delete(
            `${process.env.ANYTHINGLLM_URL}/api/v1/workspace/${WORKSPACE_ID}/thread/${threadId}`,
            { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` } }
        );

        const createThreadRes = await axios.post(
            `${process.env.ANYTHINGLLM_URL}/api/v1/workspace/${WORKSPACE_ID}/thread/new`,
            { },
            { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` } }
        );

        const newThreadId = createThreadRes.data?.thread.slug;
        if (!newThreadId) throw new Error('New thread creation failed');

        const newToken = generateSessionToken(workspaceId, newThreadId);
        res.json({ token: newToken });
    } catch (err) {
        console.error('Reset error:', err);
        res.status(500).json({ error: 'Reset failed or invalid token' });
    }
});

app.listen(PORT, () => {
    console.log(`Chat backend is running on http://localhost:${PORT}`);
});
