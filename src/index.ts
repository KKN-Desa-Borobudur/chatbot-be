import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';

import { ENV } from './env';
import API from './api';
import { initDB, createTables, addThread, deleteThreadRecord } from './db';

const app = express();

const { ANYTHINGLLM_URL, API_KEY, PORT, JWT_SECRET, JWT_EXPIRATION, DEFAULT_WORKSPACE_ID } = ENV;

app.use(cors());
app.use(bodyParser.json());

interface tokenPayload {
    workspaceId: string,
    threadId: string
}

interface chat {
    role: string,
    content: string,
    sentAt: number,
    chatId: number
}

let db = initDB();
createTables(db);

function generateSessionToken(workspaceId: string, threadId: string): string {
    return jwt.sign({ workspaceId, threadId }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

function verifySessionToken(token: string): tokenPayload {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === 'string' || !decoded) {
        throw new Error('Invalid token payload');
    }

    return decoded as tokenPayload;
}

async function createNewThread() {
    const createThreadRes = await API.post(`/api/v1/workspace/${DEFAULT_WORKSPACE_ID}/thread/new`, {})

    // check if the thread is created successfully
    if (!createThreadRes.data || !createThreadRes.data.thread || !createThreadRes.data.thread.slug) {
        throw new Error('Failed to create thread');
    }
    const threadId = createThreadRes.data?.thread.slug;
    await API.post(
        `/api/v1/workspace/${DEFAULT_WORKSPACE_ID}/thread/${threadId}/chat`,
        {
            "message": "Halo",
            "mode": "chat",
            "userId": 2,
            "reset": false
        }
    )
    addThread(db, DEFAULT_WORKSPACE_ID, threadId);

    const token = generateSessionToken(DEFAULT_WORKSPACE_ID, threadId);
    return token;
}

app.post('/session', async (req, res) => {
    try {
        let token = req.headers.authorization?.split(' ')[1];

        // if the token is not existed, create a new thread
        if (!token) {
            token = await createNewThread();
            res.json({ token });
            return;
        }

        let payload: tokenPayload;

        if (token){
            try{
                payload = verifySessionToken(token);
            } catch(err){
                token = await createNewThread();
                res.json({ token });
                return;
            }
            res.json({token});
            return;
        }

        res.json({ token });
    } catch (err) {
        console.error('Error creating session:', err);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

app.post('/chat', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const { message } = req.body;
    if (!message || !token) return res.status(400).json({ error: 'Missing message or token' });

    try {
        const payload = verifySessionToken(token);

        const { workspaceId, threadId } = payload;

        const llmResponse = await API.post(
            `/api/v1/workspace/${workspaceId}/thread/${threadId}/chat`,
            {
                "message": message,
                "mode": "chat",
                "userId": 2,
                "reset": false
            },
        )
        
        res.json({ response: llmResponse.data.textResponse });
    } catch (err) {
        console.error('Chat error:', err);
        res.status(500).json({ error: 'Chat failed or invalid token' });
    }
});

app.get('/history', async (req, res) => {              
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(400).json({ error: 'Missing token' });

    try{
        const { workspaceId, threadId } = verifySessionToken(token as string);

        const response = await API.get(
            `${ANYTHINGLLM_URL}/api/v1/workspace/${workspaceId}/thread/${threadId}/chats`
        );

        const data = response.data;

        const history: chat[] = data.history.map((item: { role: string, content: string, sentAt: number, chatId: number }) => {
            const { role, content, sentAt, chatId } = item;
            return { role, content, sentAt, chatId };
        });


        res.json({ history });
    }catch (err) {
        res.status(500).json({ error: 'Failed to fetch history or invalid token' });
        console.error('History fetch error:', err);
    }
})

app.post('/reset', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(400).json({ error: 'Missing token' });

    try {
        const payload = verifySessionToken(token);
        const { workspaceId, threadId } = payload;

        const response = await API.delete(
            `/api/v1/workspace/${workspaceId}/thread/${threadId}`
        );

        if (!response) throw new Error('Thread deletion failed');

        deleteThreadRecord(db, threadId);

        res.json({ message: 'Thread deleted successfully' });
    } catch (err) {
        console.error('Reset error:', err);
        res.status(500).json({ error: 'Reset failed or invalid token' });
    }
});

app.listen(PORT, () => {
    console.log(`Chat backend is running on http://localhost:${PORT}`);
});
