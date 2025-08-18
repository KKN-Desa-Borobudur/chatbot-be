"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const env_1 = require("./env");
const API = axios_1.default.create({
    baseURL: env_1.ENV.ANYTHINGLLM_URL,
});
// Interceptor to attach token if available
API.interceptors.request.use((req) => {
    const token = env_1.ENV.API_KEY;
    if (token) {
        req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
});
exports.default = API;
