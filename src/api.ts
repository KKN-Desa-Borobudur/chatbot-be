import axios from "axios";
import { ENV } from './env';

const API = axios.create({
    baseURL: ENV.ANYTHINGLLM_URL,
});

// Interceptor to attach token if available
API.interceptors.request.use((req) => {
  const token = ENV.API_KEY;
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;

