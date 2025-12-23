import axios from 'axios';
import { API_BASE_URL } from './api'; // Make sure this points to your backend, e.g., 'http://192.168.1.10:5000/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000, // 20 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

let currentToken = null;

/**
 * Set the Authorization token for all requests
 * @param {string|null} token - JWT token or null to remove
 */
export function setAuthToken(token) {
  currentToken = token;

  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
}

/**
 * Optional: Add request interceptor to log or modify requests
 */
apiClient.interceptors.request.use(
  (config) => {
    // Example: you could refresh token here if expired
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor to handle global errors
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // You can handle global errors here
    // e.g., redirect to login on 401, show toast, etc.
    return Promise.reject(error);
  }
);

export default apiClient;
