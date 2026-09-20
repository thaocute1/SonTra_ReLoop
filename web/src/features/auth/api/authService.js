import { api } from '../../../lib/axios'
import { supabase } from '../../../lib/supabase'

export const authService = {
  // Login with Email & Password via DRF Backend
  async loginWithEmail(email, password) {
    try {
      const response = await api.post('/accounts/login/', {
        email,
        password
      })
      if (response.data?.access) {
        localStorage.setItem('access_token', response.data.access)
      }
      if (response.data?.refresh) {
        localStorage.setItem('refresh_token', response.data.refresh)
      }
      if (response.data?.user) {
        localStorage.setItem('user_info', JSON.stringify(response.data.user))
      }
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
      if (response.data?.access) {
        localStorage.setItem('access_token', response.data.access)
      }
      if (response.data?.refresh) {
        localStorage.setItem('refresh_token', response.data.refresh)
      }
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
      if (response.data?.access) {
        localStorage.setItem('access_token', response.data.access)
      }
      if (response.data?.refresh) {
        localStorage.setItem('refresh_token', response.data.refresh)
      }
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
      if (response.data?.access) {
        localStorage.setItem('access_token', response.data.access)
      }
      if (response.data?.refresh) {
        localStorage.setItem('refresh_token', response.data.refresh)
      }
      return response.data
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data
      }
      throw { message: 'Xác thực Facebook với Server Backend thất bại.' }
    }
  },

  // Social Login Redirect with Google via Supabase OAuth
  async loginWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) throw error
    return data
  },

  // Social Login Redirect with Facebook via Supabase OAuth
  async loginWithFacebook() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) throw error
    return data
  },

  // Logout Handler
  logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_info')
  }
}

export default authService
