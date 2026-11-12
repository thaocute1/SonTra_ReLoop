import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Plus, RefreshCw, ShieldCheck, UserRound, Users } from 'lucide-react';
import { api } from '../../lib/axios';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  license_number: '',
  languages: '',
  experience_years: '0',
};

const errorMessage = error => {
  const data = error.response?.data;
  if (data?.detail) return data.detail;
  if (data?.message) return data.message;
  const errors = data?.errors || data;
  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat().find(value => typeof value === 'string');
    if (first) return first;
  }
  return 'Không thể xử lý yêu cầu. Vui lòng thử lại.';
};

export default function VendorGuidesPanel() {
  const [guides, setGuides] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [credential, setCredential] = useState(null);

  const loadGuides = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/vendors/guides/');
      setGuides(response.data.data || []);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGuides(); }, [loadGuides]);

  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        experience_years: Number(form.experience_years || 0),
        languages: form.languages.split(',').map(language => language.trim()).filter(Boolean),
      };
      const response = await api.post('/vendors/guides/', payload);
      setGuides(current => [response.data.data, ...current]);
      setCredential({ email: payload.email, password: payload.password });
      setForm(emptyForm);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const copyCredentials = async () => {
    if (!credential) return;
    try {
      await navigator.clipboard.writeText(`Email: ${credential.email}\nMật khẩu: ${credential.password}`);
    } catch {
      setError('Trình duyệt không cho phép sao chép. Bạn có thể chép thông tin đăng nhập thủ công.');
    }
  };

  const fieldClass = 'mt-1 w-full rounded-xl border border-[#C5CCC7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2F5D4A] focus:ring-2 focus:ring-[#2F5D4A]/15';

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-[#191C1A]">Đội ngũ hướng dẫn viên</h2>
        <p className="mt-1 text-sm text-[#4A514C]">Tạo tài khoản guide thuộc đơn vị và quản lý thông tin cơ bản.</p>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

      {credential && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-sm text-emerald-950">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold">Tài khoản guide đã được tạo</p>
              <p className="mt-1">Hãy gửi thông tin này cho hướng dẫn viên. Mật khẩu chỉ hiển thị trong phiên này.</p>
            </div>
            <button type="button" onClick={copyCredentials} className="rounded-lg border border-emerald-300 bg-white px-3 py-2 font-semibold">Sao chép</button>
          </div>
          <dl className="mt-3 grid gap-1 sm:grid-cols-2">
            <div><dt className="inline font-semibold">Email: </dt><dd className="inline">{credential.email}</dd></div>
            <div><dt className="inline font-semibold">Mật khẩu ban đầu: </dt><dd className="inline font-mono">{credential.password}</dd></div>
          </dl>
          <button type="button" onClick={() => setCredential(null)} className="mt-3 text-xs font-semibold underline">Ẩn thông tin đăng nhập</button>
        </div>
      )}

      <form onSubmit={submit} className="rounded-2xl border border-[#C5CCC7] bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <UserRound className="h-5 w-5 text-[#2F5D4A]" />
          <h3 className="font-bold">Tạo tài khoản guide</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Họ và tên<input className={fieldClass} name="name" value={form.name} onChange={update} required maxLength={255} /></label>
          <label className="text-sm font-semibold">Email đăng nhập<input className={fieldClass} name="email" type="email" autoComplete="off" value={form.email} onChange={update} required /></label>
          <label className="text-sm font-semibold">Mật khẩu ban đầu<input className={fieldClass} name="password" type="password" autoComplete="new-password" value={form.password} onChange={update} required /></label>
          <label className="text-sm font-semibold">Số điện thoại<input className={fieldClass} name="phone" type="tel" value={form.phone} onChange={update} /></label>
          <label className="text-sm font-semibold">Số thẻ / giấy phép<input className={fieldClass} name="license_number" value={form.license_number} onChange={update} /></label>
          <label className="text-sm font-semibold">Số năm kinh nghiệm<input className={fieldClass} name="experience_years" type="number" min="0" max="80" value={form.experience_years} onChange={update} /></label>
          <label className="text-sm font-semibold sm:col-span-2">Ngôn ngữ, phân cách bằng dấu phẩy<input className={fieldClass} name="languages" value={form.languages} onChange={update} placeholder="Tiếng Việt, English" /></label>
        </div>
        <button type="submit" disabled={saving} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2F5D4A] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">
          <Plus className="h-4 w-4" />{saving ? 'Đang tạo tài khoản…' : 'Tạo tài khoản guide'}
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-[#C5CCC7] bg-white">
        <div className="flex items-center justify-between border-b border-[#C5CCC7] px-5 py-4">
          <h3 className="flex items-center gap-2 font-bold"><Users className="h-4 w-4" />Guide của đơn vị ({guides.length})</h3>
          <button type="button" onClick={loadGuides} disabled={loading} aria-label="Tải lại danh sách" className="rounded-lg p-2 hover:bg-[#F2F5F1] disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
        {loading ? <p className="p-5 text-sm text-[#4A514C]">Đang tải danh sách…</p> : guides.length === 0 ? <p className="p-5 text-sm text-[#4A514C]">Đơn vị chưa có hướng dẫn viên.</p> : (
          <ul className="divide-y divide-[#E3E7E3]">
            {guides.map(guide => (
              <li key={guide.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold">{guide.name}</p>
                  <p className="text-sm text-[#4A514C]">{guide.email}{guide.phone ? ` · ${guide.phone}` : ''}</p>
                  <p className="mt-1 text-xs text-[#4A514C]">{guide.license_number || 'Chưa có số thẻ'} · {guide.experience_years} năm kinh nghiệm{guide.languages?.length ? ` · ${guide.languages.join(', ')}` : ''}</p>
                </div>
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"><ShieldCheck className="h-3.5 w-3.5" />{guide.status === 'active' ? 'Đang hoạt động' : guide.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="flex items-start gap-2 text-xs text-[#4A514C]"><KeyRound className="mt-0.5 h-4 w-4 shrink-0" />Mật khẩu do vendor đặt. Chỉ email, tên và thông tin nghề nghiệp được lưu trong danh sách guide.</p>
    </section>
  );
}
