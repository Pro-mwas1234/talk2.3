import axios from "axios";
import { getAuthToken, clearAuthToken, setAuthToken } from "./auth"; // You'll implement these

// Create axios instance
export const axiosInstance = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:5001/api"
      : "/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for auth token
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = getAuthToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // If using cookies instead of localStorage tokens:
    // config.withCredentials = true;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle token refresh (401 status)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        const response = await axios.post(
          "/auth/refresh",
          { refreshToken },
          { baseURL: originalRequest.baseURL }
        );

        setAuthToken(response.data.accessToken);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        clearAuthToken();
        window.location.href = "/login?session_expired=true";
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response) {
      switch (error.response.status) {
        case 403:
          window.location.href = "/forbidden";
          break;
        case 404:
          window.location.href = "/not-found";
          break;
        case 500:
          window.location.href = "/server-error";
          break;
        default:
          console.error("Unhandled error status:", error.response.status);
      }
    }

    return Promise.reject(error);
  }
);

// Helper functions (create these in auth.js)
export const getAuthToken = () => {
  return localStorage.getItem("authToken");
};

export const setAuthToken = (token) => {
  localStorage.setItem("authToken", token);
};

export const clearAuthToken = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
};

// API methods
export const api = {
  get: (url, config) => axiosInstance.get(url, config),
  post: (url, data, config) => axiosInstance.post(url, data, config),
  put: (url, data, config) => axiosInstance.put(url, data, config),
  delete: (url, config) => axiosInstance.delete(url, config),
  patch: (url, data, config) => axiosInstance.patch(url, data, config),
};
