import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Award, Building2, FileCheck, Mail, Phone, ShieldCheck, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/axios';
import { formatDisplayId } from '../../services/vendorApplicationService';

const tabs = [
  { id: 'profile', label: '1. Hồ sơ doanh nghiệp & năng lực', icon: Building2 },
  { id: 'documents', label: '2. Giấy phép kinh doanh (GPKD)', icon: FileCheck },
  { id: 'esg', label: '3. Cam kết bảo tồn & quỹ ESG 10%', icon: ShieldCheck },
];

const statuses = {
  approved: ['Đã phê duyệt', 'border-emerald-200 bg-emerald-50 text-emerald-800'],
  pending_approval: ['Chờ thẩm định', 'border-amber-200 bg-amber-50 text-amber-800'],
  need_info: ['Yêu cầu bổ sung', 'border-blue-200 bg-blue-50 text-blue-800'],
  rejected: ['Đã từ chối', 'border-rose-200 bg-rose-50 text-rose-800'],
  suspended: ['Tạm đình chỉ', 'border-rose-200 bg-rose-50 text-rose-800'],
  draft: ['Bản nháp', 'border-[#C5CCC7] bg-[#F2F5F1] text-[#4A514C]'],
};

const panelClass = 'rounded-3xl border border-[#C5CCC7] bg-[#F8FAF7] p-4 sm:p-5';
const headingClass = 'mb-3 flex items-center gap-2 font-bold text-[#2F5D4A]';

function Field({ label, value, icon: Icon }) {
  return (
    <div className="min-w-0">
      <dt className="text-[#4A514C]">{label}</dt>
      <dd className="mt-1 flex items-center gap-1.5 font-semibold">
        {Icon && <Icon size={15} className="shrink-0 text-[#4A514C]" />}
        <span className="break-words min-w-0">{value ?? 'Chưa cập nhật'}</span>
      </dd>
    </div>
  );
}

export function VendorCompanyProfile({ onClose }) {
  const dialog = useRef(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('profile');
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    api.get('/vendors/profile/', { signal: controller.signal, timeout: 15000 })
      .then(({ data }) => {
        if (!controller.signal.aborted) setProfile(data.data);
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setError([401, 403].includes(err.response?.status) ? 'access' : 'request');
        }
      });
    return () => controller.abort();
  }, [revision]);

  const status = statuses[profile?.status];

  return (
    <dialog
      ref={dialog}
      aria-labelledby="vendor-company-profile-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      className="fixed inset-0 m-auto w-[calc(100%-1.5rem)] max-w-4xl max-h-[94dvh] overflow-hidden rounded-3xl border border-[#C5CCC7] bg-white text-[#191C1A] shadow-2xl backdrop:bg-black/60"
    >
      <div className="flex max-h-[94dvh] flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#C5CCC7] bg-[#F8FAF7] px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#2F5D4A] font-bold !text-white">
              {profile?.brand_name.charAt(0) || <Building2 size={20} />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="vendor-company-profile-title" className="break-words text-base font-bold sm:text-lg">
                  {profile?.brand_name || 'Hồ sơ doanh nghiệp'}
                </h2>
                {status && <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${status[1]}`}>{status[0]}</span>}
              </div>
              {profile && (
                <p className="mt-1 text-xs text-[#4A514C]">
                  Mã hồ sơ: <b>{formatDisplayId(profile.id)}</b> · Nộp: {new Date(profile.created_at).toLocaleString('vi-VN')}
                </p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng chi tiết hồ sơ" className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-[#DCEBE3]">
            <X size={20} />
          </button>
        </header>

        {profile && (
          <div role="group" aria-label="Các phần của hồ sơ" className="grid shrink-0 grid-cols-1 gap-1 border-b border-[#C5CCC7] px-4 pt-2 sm:grid-cols-3 sm:px-6">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}
                className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-b-2xl border-b-2 px-3 py-2 text-left text-xs font-semibold sm:min-h-14 sm:justify-center sm:text-center ${
                  tab === id ? 'border-[#2F5D4A] text-[#2F5D4A]' : 'border-transparent text-[#4A514C] hover:bg-[#F2F5F1]'
                }`}>
                <Icon size={16} className="shrink-0" /> {label}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 text-sm sm:p-6">
          {error === 'access' ? (
            <div role="alert">
              <p>Vui lòng đăng nhập bằng tài khoản đối tác để xem hồ sơ.</p>
              <Link to="/partner/login" className="mt-2 inline-block font-bold text-[#2F5D4A] underline">Đăng nhập đối tác</Link>
            </div>
          ) : error ? (
            <div role="alert">
              <p>Không tải được hồ sơ doanh nghiệp.</p>
              <button type="button" className="mt-2 cursor-pointer font-bold text-[#2F5D4A] underline" onClick={() => setRevision(value => value + 1)}>Thử lại</button>
            </div>
          ) : !profile ? (
            <p role="status">Đang tải hồ sơ doanh nghiệp…</p>
          ) : (
            <>
              {profile.rejection_reason && (
                <div className="flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                  <AlertTriangle size={18} className="shrink-0" />
                  <p><b>Ghi chú thẩm định từ BQL</b><br />{profile.rejection_reason}</p>
                </div>
              )}
              {tab === 'profile' && (
                <>
                  <section>
                    <h3 className={headingClass}><Building2 size={17} /> Thông tin pháp nhân doanh nghiệp</h3>
                    <dl className={`${panelClass} grid grid-cols-1 gap-4 sm:grid-cols-2`}>
                      <Field label="Tên doanh nghiệp chính thức" value={profile.brand_name} />
                      <Field label="Người đại diện theo pháp luật" />
                      <Field label="Mã số thuế / GPKD" value={profile.business_license_code || null} />
                      <Field label="Cơ quan cấp phép" />
                      <Field label="Hotline đại diện" value={profile.phone || null} icon={Phone} />
                      <Field label="Email nhận tài khoản cổng đối tác" value={profile.account_email || profile.email || null} icon={Mail} />
                      <Field label="Phạm vi ngành nghề kinh doanh" />
                      <Field label="Giới thiệu tóm tắt đơn vị" />
                    </dl>
                  </section>
                  <section>
                    <h3 className={headingClass}><Award size={17} /> Năng lực tổ chức và đội ngũ thực địa</h3>
                    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className={panelClass}><Field label="Kinh nghiệm lữ hành" /></div>
                      <div className={panelClass}><Field label="Hướng dẫn viên (Guide)" value={`${profile.guides_count} hướng dẫn viên`} /></div>
                      <div className={panelClass}><Field label="Địa bàn tác nghiệp" /></div>
                    </dl>
                  </section>
                </>
              )}
              {tab === 'documents' && (
                <section>
                  <h3 className={headingClass}><FileCheck size={17} /> Giấy phép kinh doanh</h3>
                  <dl className={`${panelClass} grid grid-cols-1 gap-4 sm:grid-cols-2`}>
                    <Field label="Tên doanh nghiệp" value={profile.brand_name} />
                    <Field label="Mã số thuế / GPKD" value={profile.business_license_code || null} />
                    <Field label="Cơ quan cấp phép" />
                    <Field label="Ngày cấp" />
                  </dl>
                  <p className="mt-3 text-[#4A514C]">Chưa có bản giấy phép đính kèm để xem.</p>
                </section>
              )}
              {tab === 'esg' && (
                <section className="space-y-3">
                  <h3 className={headingClass}><ShieldCheck size={17} /> Cam kết bảo tồn bán đảo Sơn Trà</h3>
                  <div className={panelClass}>
                    <h4 className="font-bold text-[#2F5D4A]">Quỹ bảo tồn 10%</h4>
                    <p className="mt-1 text-[#4A514C]">Một phần doanh thu từ đơn đặt tour được ghi nhận vào quỹ bảo tồn để hỗ trợ bảo vệ hệ sinh thái Sơn Trà.</p>
                  </div>
                  <div className={panelClass}>
                    <h4 className="font-bold text-[#2F5D4A]">An toàn rừng và giảm rác thải</h4>
                    <p className="mt-1 text-[#4A514C]">Hướng dẫn du khách tuân thủ quy định an toàn, tránh gây tiếng ồn, không cho động vật hoang dã ăn và thu gom rác sau chuyến đi.</p>
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <footer className="shrink-0 border-t border-[#C5CCC7] bg-[#F8FAF7] px-4 py-3 sm:px-6">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-xl border border-[#C5CCC7] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#DCEBE3]">
            Đóng hồ sơ
          </button>
        </footer>
      </div>
    </dialog>
  );
}
