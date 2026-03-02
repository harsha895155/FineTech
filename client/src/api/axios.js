import axios from '../shims/axios';

export const SERVER_URL = 'http://127.0.0.1:5011';

const api = axios.create({
    baseURL: `${SERVER_URL}/api`,
    headers: {
        'Content-Type': 'application/json'
    }
});

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

export default api;
