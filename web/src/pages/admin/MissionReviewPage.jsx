import React, { useEffect, useState } from 'react';
import api from '../../lib/axios';

export default function MissionReviewPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const load = async () => {
    try { const response = await api.get('/challenging/missions/review-queue/'); setItems(response.data?.results || []); setError(''); }
    catch (e) { setError(e.response?.data?.detail || 'Không thể tải hàng chờ duyệt.'); }
  };
  useEffect(() => { load(); }, []);
  const review = async (item, decision) => {
    const reason = decision === 'rejected' ? window.prompt('Lý do từ chối:') : '';
    if (decision === 'rejected' && reason === null) return;
    try {
      await api.post(`/challenging/missions/attempts/${item.id}/review/`, { decision, reason });
      setItems(prev => prev.filter(row => row.id !== item.id));
    } catch (e) { setError(e.response?.data?.error || e.response?.data?.detail || 'Không thể xử lý minh chứng.'); }
  };
  return <main className="p-6 max-w-5xl mx-auto"><h1 className="text-2xl font-bold mb-5">Duyệt nhiệm vụ xanh</h1>{error && <p className="text-red-600 mb-4">{error}</p>}{!items.length && !error && <p>Không có minh chứng đang chờ duyệt.</p>}<div className="grid gap-4">{items.map(item => <article key={item.id} className="rounded-2xl border p-4 bg-white"><div className="flex justify-between gap-4"><div><h2 className="font-bold">{item.title}</h2><p className="text-sm text-gray-600">{item.customer?.name} · {item.customer?.email}</p></div>{item.evidence && <a className="text-emerald-700 underline" href={item.evidence} target="_blank" rel="noreferrer">Xem ảnh</a>}</div><div className="mt-4 flex gap-2"><button className="px-4 py-2 rounded-xl bg-emerald-700 text-white" onClick={() => review(item, 'approved')}>Duyệt</button><button className="px-4 py-2 rounded-xl border border-red-300 text-red-700" onClick={() => review(item, 'rejected')}>Từ chối</button></div></article>)}</div></main>;
}
