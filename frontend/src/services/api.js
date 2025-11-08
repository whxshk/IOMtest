import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If token expired and we have a refresh token
    if (error.response?.status === 401 &&
        error.response?.data?.code === 'TOKEN_EXPIRED' &&
        !originalRequest._retry) {

      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
            refreshToken
          });

          const { token } = response.data;
          localStorage.setItem('token', token);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  register: (userData) =>
    api.post('/auth/register', userData),

  logout: () =>
    api.post('/auth/logout'),

  getMe: () =>
    api.get('/auth/me'),

  refresh: (refreshToken) =>
    api.post('/auth/refresh', { refreshToken })
};

// Cases API
export const casesAPI = {
  create: (caseData) =>
    api.post('/cases', caseData),

  getAll: (params = {}) =>
    api.get('/cases', { params }),

  getById: (caseId) =>
    api.get(`/cases/${caseId}`),

  update: (caseId, data) =>
    api.put(`/cases/${caseId}`, data),

  addNote: (caseId, message, isPublic) =>
    api.post(`/cases/${caseId}/notes`, { message, isPublic }),

  requestAssistance: (caseId, toEmbassyId, note) =>
    api.post(`/cases/${caseId}/request-assistance`, { toEmbassyId, note })
};

// AI API
export const aiAPI = {
  citizenAssist: (prompt) =>
    api.post('/ai/citizen-assist', { prompt }),

  staffAssist: (task, content, options) =>
    api.post('/ai/staff-assist', { task, content, options })
};

// Admin API
export const adminAPI = {
  getMetrics: () =>
    api.get('/admin/metrics'),

  getAuditLogs: (params) =>
    api.get('/admin/audit-logs', { params }),

  verifyAuditChain: (startId, endId) =>
    api.get('/admin/audit-logs/verify', { params: { startId, endId } }),

  getEmbassies: () =>
    api.get('/admin/embassies'),

  createEmbassy: (data) =>
    api.post('/admin/embassies', data),

  getUsers: (params) =>
    api.get('/admin/users', { params }),

  createStaff: (data) =>
    api.post('/admin/staff', data),

  updateUser: (userId, data) =>
    api.put(`/admin/users/${userId}`, data)
};

export default api;
