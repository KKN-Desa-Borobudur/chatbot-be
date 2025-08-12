import ms from 'ms';
import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

export const ENV = {
    ANYTHINGLLM_URL: requireEnv('ANYTHINGLLM_URL'),
    API_KEY: requireEnv('API_KEY'),
    PORT: requireEnv('PORT'),
    JWT_SECRET: requireEnv('JWT_SECRET'),
    JWT_EXPIRATION: requireEnv('JWT_EXPIRATION') as ms.StringValue,
    DEFAULT_WORKSPACE_ID: requireEnv('DEFAULT_WORKSPACE_ID'),
};