import api from '../../../lib/axios'
export async function getFeaturedTours() {
  const response = await api.get('/tours/')
  const data = response.data || {}
  return Array.isArray(data) ? data : (data.results || [])
}
