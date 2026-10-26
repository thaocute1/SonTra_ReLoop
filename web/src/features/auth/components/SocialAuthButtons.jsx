import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { authService } from '../api/authService'

export function SocialAuthButtons({ onAuthenticated, onError, disabled = false }) {
  const [provider, setProvider] = useState('')

  const handleSuccess = async (loginMethod, token) => {
    setProvider(loginMethod)
    try {
      const result = loginMethod === 'google'
        ? await authService.loginWithGoogleToken(token)
        : await authService.loginWithFacebookToken(token)
      onAuthenticated(result)
    } catch (error) {
      onError(error)
    } finally {
      setProvider('')
    }
  }

  const loginWithGoogle = useGoogleLogin({
    flow: 'implicit',
    onSuccess: (response) => handleSuccess('google', response.access_token),
    onError: () => onError({ message: 'Không thể đăng nhập bằng Google.' }),
  })

  const loginWithFacebook = async () => {
    setProvider('facebook')
    try {
      const token = await authService.getFacebookAccessToken()
      await handleSuccess('facebook', token)
    } catch (error) {
      onError(error)
      setProvider('')
    }
  }

  const isBusy = Boolean(provider)
  return (
    <div className="auth-social">
      <button
        type="button"
        className="auth-social__button motion-press"
        disabled={disabled || isBusy}
        onClick={() => loginWithGoogle()}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
        </svg>
        {provider === 'google' ? 'Đang kết nối...' : 'Google'}
      </button>
      <button
        type="button"
        className="auth-social__button motion-press"
        disabled={disabled || isBusy}
        onClick={loginWithFacebook}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M18 9a9 9 0 1 0-10.406 8.892V11.602H5.311V9h2.283V7.017c0-2.254 1.343-3.5 3.397-3.5.984 0 2.013.176 2.013.176v2.213h-1.134c-1.118 0-1.466.693-1.466 1.404V9h2.496l-.399 2.602h-2.097v6.29A9.003 9.003 0 0 0 18 9Z" fill="#1877F2"/>
          <path d="M12.501 11.602 12.9 9h-2.496V7.31c0-.711.348-1.404 1.466-1.404h1.134V3.693s-1.029-.176-2.013-.176c-2.054 0-3.397 1.246-3.397 3.5V9H5.311v2.602h2.283v6.29a9.066 9.066 0 0 0 2.812 0v-6.29h2.095Z" fill="white"/>
        </svg>
        {provider === 'facebook' ? 'Đang kết nối...' : 'Facebook'}
      </button>
    </div>
  )
}
