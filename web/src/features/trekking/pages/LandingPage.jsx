import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Compass,
  Navigation,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { api } from '../../../lib/axios'
import { useScrollReveal } from '../../../hooks/useScrollReveal'

const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`

const DIFFICULTY_LABELS = {
  easy: 'Dễ (Gia đình)',
  moderate: 'Trung bình',
  challenging: 'Thử thách',
  expert: 'Chuyên gia',
}

function hasActiveSession() {
  const token = localStorage.getItem('access_token')
  if (!token) return false
  try {
    const encoded = token.split('.')[1]
    const payload = encoded ? JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))) : null
    if (payload?.exp && payload.exp * 1000 <= Date.now()) return false
    return true
  } catch {
    return false
  }
}

export function LandingPage() {
  useScrollReveal()
  const signedIn = hasActiveSession()
  const [tours, setTours] = useState([])
  const [loadingTours, setLoadingTours] = useState(true)
  const [toursError, setToursError] = useState('')

  const loadTours = useCallback(() => {
    setLoadingTours(true)
    setToursError('')
    return api
      .get('/tours/')
      .then((res) => {
        const data = res.data?.status === 'success' ? res.data?.data : res.data
        setTours(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        setTours([])
        setToursError('Không thể kết nối danh sách tuyến trekking lúc này.')
      })
      .finally(() => {
        setLoadingTours(false)
      })
  }, [])

  useEffect(() => {
    loadTours()
  }, [loadTours])

  const featuredTours = tours.slice(0, 3)

  return (
    <div className="landing-page m3-public-page bg-[#F8FAF7] font-be-vietnam motion-page-enter">
      <main>
        {/* ================= HERO SECTION ================= */}
        <section className="hero bg-white border-b border-[#C5CCC7]">
          <div className="hero__content motion-stagger">
            <h1 className="hero__title font-fraunces">
              Khám phá Sơn Trà<br />có trách nhiệm
            </h1>

            <p className="hero__lead font-be-vietnam">
              Đặt tour trekking sinh thái từ đơn vị được Ban Quản lý xác minh, xác thực hành trình qua checkpoint GPS/QR trên tuyến để tích Green Points và đóng góp trực tiếp 10% vào quỹ bảo tồn bán đảo Sơn Trà.
            </p>

            <div className="hero__actions">
              <Link className="hero-btn-primary min-h-12 gap-2 motion-press" to="/trekking">
                <span>Khám phá tuyến trekking</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                className="hero-btn-outline min-h-12 motion-press"
                to={signedIn ? '/dashboard/trekking' : '/register'}
              >
                {signedIn ? 'Vào bảng điều khiển' : 'Đăng ký tham gia'}
              </Link>
            </div>
          </div>

          <div className="hero__visual motion-fade-up">
            <img
              src="/assets/figma/landing-photo.jpeg"
              alt="Khung cảnh hoàng hôn trên vịnh và triền núi bán đảo Sơn Trà"
              className="rounded-2xl"
            />
          </div>
        </section>

        {/* ================= LIVE ROUTES DISPATCH ================= */}
        <section id="live-routes" className="landing-section bg-[#F8FAF7] border-b border-[#E7ECE8]">
          <div className="landing-container">
            <div className="landing-section__head">
              <div>
                <h2 className="landing-h2 font-fraunces">Tuyến trekking đang mở bán</h2>
                <p className="landing-subcopy">
                  Xem trước lộ trình, mức độ địa hình, số điểm checkpoint GPS và lịch khởi hành gần nhất trước khi đặt chỗ.
                </p>
              </div>
              <Link to="/trekking" className="landing-link-all motion-underline">
                <span>Xem tất cả tuyến</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {loadingTours && (
              <div className="live-routes-grid" aria-busy="true" aria-label="Đang tải tuyến trekking">
                {[0, 1, 2].map((item) => (
                  <article key={item} className="live-route-card live-route-card--skeleton" aria-hidden="true">
                    <div className="live-route-card__media" />
                    <div className="live-route-card__body">
                      <span className="skeleton-bar w-24 h-4" />
                      <span className="skeleton-bar w-3/4 h-6" />
                      <span className="skeleton-bar w-1/2 h-4" />
                      <span className="skeleton-bar w-full h-10 mt-2" />
                    </div>
                  </article>
                ))}
              </div>
            )}

            {!loadingTours && toursError && (
              <div className="landing-state-box landing-state-box--error" role="alert">
                <p>{toursError}</p>
                <button type="button" onClick={loadTours} className="landing-retry-btn">
                  <RefreshCw className="w-4 h-4" />
                  <span>Tải lại danh sách</span>
                </button>
              </div>
            )}

            {!loadingTours && !toursError && featuredTours.length === 0 && (
              <div className="landing-state-box">
                <p>Hiện chưa có tuyến trekking nào được mở bán trên hệ thống.</p>
                <Link to="/partner" className="landing-link-all mt-3 inline-flex">
                  <span>Tìm hiểu đăng ký tuyến cho đơn vị lữ hành</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {!loadingTours && !toursError && featuredTours.length > 0 && (
              <div className="live-routes-grid">
                {featuredTours.map((tour) => {
                  const distance = tour.route?.total_distance_km ?? tour.distance ?? null
                  const checkpointCount = Array.isArray(tour.checkpoints) ? tour.checkpoints.length : 0
                  const difficultyLabel = tour.difficulty_label || DIFFICULTY_LABELS[tour.difficulty_level] || 'Trung bình'
                  const nextDeparture = tour._next_departure || 'Xem lịch khởi hành'
                  const openSchedules = (tour.schedules || []).filter(
                    (s) => ['open', 'almost_full'].includes(s.status) && Number(s.remaining_slots) > 0
                  )

                  return (
                    <article key={tour.id} className="live-route-card">
                      <Link to={`/trekking/${tour.id}`} className="live-route-card__media">
                        <img
                          src={tour.cover_image_url || '/assets/figma/landing-photo.jpeg'}
                          alt={tour.title}
                        />
                        <span className="live-route-card__difficulty">{difficultyLabel}</span>
                      </Link>

                      <div className="live-route-card__body">
                        <div className="live-route-card__vendor">
                          <span>{tour.vendor_name || 'Đơn vị đối tác Sơn Trà'}</span>
                          {checkpointCount > 0 && (
                            <span className="tabular-nums">{checkpointCount} checkpoint GPS</span>
                          )}
                        </div>

                        <h3 className="live-route-card__title">
                          <Link to={`/trekking/${tour.id}`}>{tour.title}</Link>
                        </h3>

                        <dl className="live-route-card__telemetry tabular-nums">
                          <div>
                            <dt><Navigation className="w-3.5 h-3.5" aria-hidden="true" /> Cự ly</dt>
                            <dd>{distance ? `${distance} km` : 'Đang cập nhật'}</dd>
                          </div>
                          <div>
                            <dt><Clock3 className="w-3.5 h-3.5" aria-hidden="true" /> Thời lượng</dt>
                            <dd>{tour.duration_hours ? `${tour.duration_hours} giờ` : 'Đang cập nhật'}</dd>
                          </div>
                        </dl>

                        <div className="live-route-card__schedule">
                          <CalendarDays className="w-4 h-4 shrink-0 text-[#2F5D4A]" aria-hidden="true" />
                          <span>
                            {openSchedules.length > 0
                              ? `${nextDeparture} · Còn ${openSchedules[0].remaining_slots} chỗ`
                              : nextDeparture}
                          </span>
                        </div>

                        <div className="live-route-card__footer">
                          <div className="live-route-card__price tabular-nums">
                            <strong>{tour.price_formatted || money(tour.price)}</strong>
                            <span>/người</span>
                          </div>
                          <Link to={`/trekking/${tour.id}`} className="live-route-card__cta">
                            Xem chi tiết
                          </Link>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* ================= STEWARDSHIP MECHANISM ================= */}
        <section id="stewardship" className="landing-section bg-[#F2F5F1] border-b border-[#E7ECE8]">
          <div className="landing-container">
            <div className="max-w-2xl">
              <h2 className="landing-h2 font-fraunces">Hành trình gắn với kiểm chứng thực địa</h2>
              <p className="landing-subcopy">
                Mỗi chuyến trekking trên Sơn Trà ReLoop nối liền trải nghiệm du khách với dữ liệu checkpoint ngoài thực địa và quỹ bảo tồn bán đảo.
              </p>
            </div>

            <ol className="stewardship-trail">
              <li>
                <span className="stewardship-trail__step tabular-nums">1</span>
                <h3>Chọn tuyến và đặt lịch minh bạch</h3>
                <p>
                  Đối chiếu cự ly, độ khó, hướng dẫn viên và lịch khởi hành còn chỗ từ các đơn vị lữ hành đã được BQL phê duyệt; thanh toán nhanh qua VietQR.
                </p>
              </li>
              <li>
                <span className="stewardship-trail__step tabular-nums">2</span>
                <h3>Xác thực checkpoint GPS và mã QR</h3>
                <p>
                  Quét mã QR tại từng điểm kiểm tra trên tuyến trong bán kính GPS thực tế để xác nhận tiến độ an toàn và ghi nhận Green Points cá nhân hoặc theo nhóm.
                </p>
              </li>
              <li>
                <span className="stewardship-trail__step tabular-nums">3</span>
                <h3>Trích 10% vào Quỹ bảo tồn Sơn Trà</h3>
                <p>
                  Mỗi đơn đặt tour tự động ghi nhận phần đóng góp bảo tồn và đồng bộ về bảng điều khiển ESG để Ban Quản lý theo dõi minh bạch theo thời gian thực.
                </p>
              </li>
            </ol>
          </div>
        </section>

        {/* ================= TOUR OPERATOR & BQL GOVERNANCE ================= */}
        <section id="bql-policy" className="partner-section landing-section bg-[#F8FAF7]">
          <div className="landing-container">
            <div className="bql-governance-panel">
              <div className="space-y-6">
                <h2 className="text-3xl sm:text-4xl font-bold text-[#191C1A] leading-[1.2] font-fraunces">
                  Đồng hành vận hành tour sinh thái cùng Ban Quản lý Sơn Trà
                </h2>

                <p className="text-base text-[#4A514C] leading-relaxed max-w-xl">
                  Nền tảng kết nối trực tiếp các đơn vị lữ hành địa phương với quy trình phê duyệt tuyến, chuẩn hóa điểm dừng GPS/QR và giám sát an toàn của Ban Quản lý bán đảo Sơn Trà.
                </p>

                <div className="bql-pillars">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#DCEBE3] flex items-center justify-center shrink-0 mt-0.5">
                      <Compass className="w-5 h-5 text-[#2F5D4A]" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#191C1A]">
                        Dành cho đơn vị lữ hành (Vendor Tour)
                      </h3>
                      <p className="text-sm text-[#4A514C] mt-1 leading-relaxed">
                        Quản lý hồ sơ tuyến trekking, thiết lập lịch khởi hành, phân công hướng dẫn viên và phát hành mã QR cho từng điểm checkpoint trên thực địa.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#DCEBE3] flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-5 h-5 text-[#2F5D4A]" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#191C1A]">
                        Chính sách xét duyệt và đối soát BQL
                      </h3>
                      <p className="text-sm text-[#4A514C] mt-1 leading-relaxed">
                        Mọi đơn vị lữ hành và tuyến mới đều qua bước kiểm duyệt của BQL trước khi mở bán; mỗi lượt đặt chỗ tự động trích 10% vào quỹ bảo tồn và đối soát minh bạch.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <Link
                    to="/partner"
                    className="partner-cta-btn min-h-12 !text-white motion-press"
                  >
                    Đăng ký làm đối tác
                  </Link>

                  <Link
                    to="/bql-portal/login"
                    className="hero-btn-outline min-h-12 motion-press"
                  >
                    Cổng quản lý BQL
                  </Link>
                </div>
              </div>

              <div className="bql-governance-panel__media">
                <img
                  src="/assets/figma/auth-3.jpeg"
                  alt="Cung đường ven biển và sườn rừng xanh tại bán đảo Sơn Trà"
                  className="w-full aspect-[4/3] object-cover rounded-2xl border border-[#C5CCC7]"
                />
                <p className="mt-3 text-xs text-[#4A514C] leading-relaxed">
                  Tất cả tuyến công khai trên nền tảng đều gắn bản đồ lộ trình, bán kính quét GPS tại từng checkpoint và đầu mối xử lý sự cố thực địa với lực lượng tuần tra BQL.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default LandingPage
