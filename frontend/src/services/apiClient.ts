import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: () => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, success: boolean = false) => {
  failedQueue.forEach((prom) => {
    if (success) {
      prom.resolve();
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

const clearAuthAndRedirect = () => {
  axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true })
    .catch(() => {
    })
    .finally(() => {
      document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        window.location.href = '/login';
      }
    });
};

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const isAuthError = error.response?.status === 401;
    const isRefreshUrl = originalRequest.url?.includes('/api/auth/refresh');
    const isLogoutUrl = originalRequest.url?.includes('/api/auth/logout');
    const isAuthUrl = originalRequest.url?.includes('/api/auth/login') || 
                      originalRequest.url?.includes('/api/auth/register');

    if (isAuthError && !isRefreshUrl && !isAuthUrl && !originalRequest._retry && !isLogoutUrl) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: () => resolve(apiClient(originalRequest)),
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await apiClient.post('/api/auth/refresh');
        
        processQueue(null, true);
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed, clearing auth');
        processQueue(refreshError, false);
        clearAuthAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (isAuthError && isRefreshUrl) {
      console.error('Refresh token invalid, clearing auth');
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    if (
      error.response?.status === 403 &&
      (error.response?.data as any)?.detail?.includes('заблокирован')
    ) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;