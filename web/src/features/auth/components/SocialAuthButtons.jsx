import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { Button } from '../../../components/ui'
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
      <Button
        variant="secondary"
        type="button"
        className="auth-social__button"
        disabled={disabled || isBusy}
        onClick={() => loginWithGoogle()}
      >
        <span aria-hidden="true">○</span> {provider === 'google' ? 'Đang kết nối...' : 'Google'}
      </Button>
      <Button
        variant="secondary"
        type="button"
        className="auth-social__button"
        disabled={disabled || isBusy}
        onClick={loginWithFacebook}
      >
        <span aria-hidden="true">□</span> {provider === 'facebook' ? 'Đang kết nối...' : 'Facebook'}
      </Button>
    </div>
  )
}