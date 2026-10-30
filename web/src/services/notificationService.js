import { api } from '../lib/axios';

const READ_STORAGE_KEY = 'sontra_read_notification_ids';
const DISMISSED_STORAGE_KEY = 'sontra_dismissed_notification_ids';

function getStoredIds(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredIds(key, ids) {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch (e) {
    console.error('Cannot save notifications to localStorage:', e);
  }
}

export const notificationService = {
  /**
   * Lấy danh sách thông báo từ API Django và đồng bộ trạng thái đã đọc từ localStorage
   */
  async getNotifications(role = 'customer') {
    try {
      const res = await api.get('/cms-chatbot/community/notifications/', {
        params: { role },
        timeout: 4000
      });

      if (res.data && res.data.status === 'success' && Array.isArray(res.data.data)) {
        const readIds = getStoredIds(READ_STORAGE_KEY);
        const dismissedIds = getStoredIds(DISMISSED_STORAGE_KEY);

        const list = res.data.data
          .filter(n => !dismissedIds.includes(n.id))
          .map(n => ({
            ...n,
            is_read: readIds.includes(n.id) ? true : Boolean(n.is_read)
          }));

        const unreadCount = list.filter(n => !n.is_read).length;

        return {
          notifications: list,
          unreadCount
        };
      }
      return { notifications: [], unreadCount: 0 };
    } catch (err) {
      console.warn('API getNotifications error, using local fallback:', err);
      return { notifications: [], unreadCount: 0 };
    }
  },

  /**
   * Đánh dấu 1 thông báo là đã đọc
   */
  markAsRead(notificationId) {
    const readIds = getStoredIds(READ_STORAGE_KEY);
    if (!readIds.includes(notificationId)) {
      readIds.push(notificationId);
      saveStoredIds(READ_STORAGE_KEY, readIds);
    }
  },

  /**
   * Đánh dấu tất cả thông báo là đã đọc
   */
  markAllAsRead(notificationIds = []) {
    const readIds = getStoredIds(READ_STORAGE_KEY);
    const updated = Array.from(new Set([...readIds, ...notificationIds]));
    saveStoredIds(READ_STORAGE_KEY, updated);
  },

  /**
   * Xoá / Ẩn thông báo khỏi danh sách hiển thị
   */
  dismissNotification(notificationId) {
    const dismissedIds = getStoredIds(DISMISSED_STORAGE_KEY);
    if (!dismissedIds.includes(notificationId)) {
      dismissedIds.push(notificationId);
      saveStoredIds(DISMISSED_STORAGE_KEY, dismissedIds);
    }
  }
};

export default notificationService;

