import { api } from '../../../lib/axios'

function persistAuthSession(data) {
  if (data?.access) localStorage.setItem('access_token', data.access)
  if (data?.refresh) localStorage.setItem('refresh_token', data.refresh)
  if (data?.user) localStorage.setItem('user_info', JSON.stringify(data.user))
}

let facebookSdkPromise

function loadFacebookSdk() {
  if (window.FB) return Promise.resolve(window.FB)
  if (!import.meta.env.VITE_FACEBOOK_APP_ID) {
    return Promise.reject({ message: 'Chưa cấu hình Facebook App ID cho frontend.' })
  }
  if (facebookSdkPromise) return facebookSdkPromise

  facebookSdkPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB.init({
        appId: import.meta.env.VITE_FACEBOOK_APP_ID,
        cookie: true,
        xfbml: false,
        version: 'v19.0',
      })
      resolve(window.FB)
    }
    const script = document.createElement('script')
    script.async = true
    script.defer = true
    script.crossOrigin = 'anonymous'
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    script.onerror = () => reject({ message: 'Không thể tải Facebook SDK.' })
    document.body.appendChild(script)
  })
  return facebookSdkPromise
}

export const authService = {
  // Login with Email & Password via DRF Backend
  async loginWithEmail(email, password) {
    try {
      const response = await api.post('/accounts/login/', {
        email,
        password
      })
      persistAuthSession(response.data)
      return response.data
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data
      }
      throw { message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra Backend.' }
    }
  },

  // Register User via DRF Backend
  async register(userData) {
    try {
      const response = await api.post('/accounts/register/', userData)
      persistAuthSession(response.data)
      return response.data
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data
      }
      throw { message: 'Không thể đăng ký tài khoản. Vui lòng thử lại.' }
    }
  },

  // Send Google Token to DRF Backend OAuth API
  async loginWithGoogleToken(token) {
    try {
      const response = await api.post('/accounts/google/', { token })
      persistAuthSession(response.data)
      return response.data
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data
      }
      throw { message: 'Xác thực Google với Server Backend thất bại.' }
    }
  },

  // Send Facebook Token to DRF Backend OAuth API
  async loginWithFacebookToken(token) {
    try {
      const response = await api.post('/accounts/facebook/', { token })
      persistAuthSession(response.data)
      return response.data
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data
      }
      throw { message: 'Xác thực Facebook với Server Backend thất bại.' }
    }
  },

  async getFacebookAccessToken() {
    const facebook = await loadFacebookSdk()
    return new Promise((resolve, reject) => {
      facebook.login((response) => {
        if (response.authResponse?.accessToken) {
          resolve(response.authResponse.accessToken)
        } else {
          reject({ message: 'Bạn đã hủy đăng nhập bằng Facebook.' })
        }
      }, { scope: 'email,public_profile' })
    })
  },

  // Logout Handler
  logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_info')
  }
}

export default authService
