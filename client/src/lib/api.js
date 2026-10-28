import axios from 'axios';

export const TOKEN_KEY = 'sw_token';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isAuthCall = error.config?.url?.startsWith('/auth/login') || error.config?.url?.startsWith('/auth/register');
    if (error.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem(TOKEN_KEY);
      if (!location.pathname.startsWith('/login')) location.assign('/login');
    }
    return Promise.reject(error);
  }
);

export const errMsg = (e) => e?.response?.data?.message || (e?.code === 'ERR_NETWORK' ? 'Cannot reach the server. Is the API running?' : e?.message) || 'Something went wrong';

export default api;
