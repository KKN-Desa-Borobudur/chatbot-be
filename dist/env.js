"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
exports.ENV = {
    ANYTHINGLLM_URL: requireEnv('ANYTHINGLLM_URL'),
    API_KEY: requireEnv('API_KEY'),
    PORT: requireEnv('PORT'),
    JWT_SECRET: requireEnv('JWT_SECRET'),
    JWT_EXPIRATION: requireEnv('JWT_EXPIRATION'),
    DEFAULT_WORKSPACE_ID: requireEnv('DEFAULT_WORKSPACE_ID'),
};
