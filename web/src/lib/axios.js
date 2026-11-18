import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: Attach JWT Token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor: Refresh expired access token on 401 or clear session
let refreshPromise = null

const SKIP_REFRESH_PATHS = [
  '/accounts/login/',
  '/accounts/register/',
  '/accounts/google/',
  '/accounts/facebook/',
  '/accounts/token/refresh/',
]

function clearAuthSession() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user_info')
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const statusCode = error.response?.status
    const requestUrl = originalRequest?.url || ''
    const shouldSkipRefresh = SKIP_REFRESH_PATHS.some((path) => requestUrl.includes(path))

    if (statusCode === 401 && originalRequest && !originalRequest._retry && !shouldSkipRefresh) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        clearAuthSession()
        return Promise.reject(error)
      }

      originalRequest._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_BASE_URL}/accounts/token/refresh/`, { refresh: refreshToken })
            .then((res) => {
              const newAccessToken = res.data?.access
              if (!newAccessToken) {
                throw new Error('Missing access token from refresh response')
              }
              localStorage.setItem('access_token', newAccessToken)
              return newAccessToken
            })
            .finally(() => {
              refreshPromise = null
            })
        }

        const newAccessToken = await refreshPromise
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        clearAuthSession()
        return Promise.reject(refreshError)
      }
    }

    if (statusCode === 401) {
      clearAuthSession()
    }
    return Promise.reject(error)
  }
)

export default api
