import { api } from '../lib/axios'

export const adminTourService = {
  list: (params, signal) => api.get('/tours/admin/review-queue/', { params, signal }).then(response => response.data),
  detail: (id, signal) => api.get(`/tours/admin/${id}/`, { signal }).then(response => response.data.data),
  review: (id, action, reason = '') => api.post(`/tours/admin/${id}/review/`, { action, reason }).then(response => response.data),
}
