import { Card } from '../../../components/ui'

const MEDIA_CAPTION = {
  login: {
    title: 'Hành trình Sơn Trà có trách nhiệm',
    body: 'Đăng nhập để giữ chỗ tour trekking được BQL xác minh, theo dõi checkpoint GPS/QR và Green Points của bạn.',
  },
  register: {
    title: 'Tham gia cộng đồng bảo tồn Sơn Trà',
    body: 'Mỗi chuyến đi đóng góp 10% vào quỹ bảo tồn và ghi nhận hành trình xanh qua điểm check-in thực địa.',
  },
}

export function AuthPage({ title, description, contextBanner, children, variant = 'login' }) {
  const caption = MEDIA_CAPTION[variant] || MEDIA_CAPTION.login
  return (
    <main className={`auth-page auth-page--${variant} motion-page-enter`}>
      <div className="auth-layout">
        <aside className="auth-media motion-fade-in" aria-label="Cảnh quan bán đảo Sơn Trà">
          <div className="auth-media__scrim">
            <p className="auth-media__title font-fraunces">{caption.title}</p>
            <p className="auth-media__body">{caption.body}</p>
          </div>
        </aside>
        <section className="auth-panel motion-fade-up" aria-labelledby={`${variant}-auth-title`}>
          <Card className="auth-card">
            <div className="auth-card__content">
              <h1 id={`${variant}-auth-title`}>{title}</h1>
              <p className="auth-card__desc">{description}</p>
              {contextBanner && (
                <p className="auth-context-banner" role="status">
                  {contextBanner}
                </p>
              )}
              {children}
            </div>
          </Card>
        </section>
      </div>
    </main>
  )
}
