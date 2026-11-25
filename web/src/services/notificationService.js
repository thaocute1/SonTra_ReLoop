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
   * Lấy danh sách thông báo từ API Django (trạng thái đã đọc/ẩn được lưu trên DB)
   */
  async getNotifications(role = 'customer') {
    try {
      const res = await api.get('/cms-chatbot/community/notifications/', {
        params: { role },
        timeout: 4000
      });

      if (res.data && res.data.status === 'success' && Array.isArray(res.data.data)) {
        const list = res.data.data.map(n => ({
          ...n,
          is_read: n.is_read !== undefined ? Boolean(n.is_read) : !n.is_unread
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
   * Đánh dấu 1 thông báo là đã đọc (lưu trên DB)
   */
  async markAsRead(notificationId) {
    const readIds = getStoredIds(READ_STORAGE_KEY);
    if (!readIds.includes(notificationId)) {
      readIds.push(notificationId);
      saveStoredIds(READ_STORAGE_KEY, readIds);
    }
    try {
      await api.post('/cms-chatbot/community/notifications/mark-read/', {
        notification_ids: [notificationId]
      });
    } catch (err) {
      console.warn('API markAsRead error:', err);
    }
  },

  /**
   * Đánh dấu tất cả thông báo là đã đọc (lưu trên DB)
   */
  async markAllAsRead(notificationIds = []) {
    const readIds = getStoredIds(READ_STORAGE_KEY);
    const updated = Array.from(new Set([...readIds, ...notificationIds]));
    saveStoredIds(READ_STORAGE_KEY, updated);
    try {
      await api.post('/cms-chatbot/community/notifications/mark-read/', {
        notification_ids: notificationIds,
        mark_all: true
      });
    } catch (err) {
      console.warn('API markAllAsRead error:', err);
    }
  },

  /**
   * Xoá / Ẩn thông báo khỏi danh sách hiển thị (lưu trên DB)
   */
  async dismissNotification(notificationId) {
    const dismissedIds = getStoredIds(DISMISSED_STORAGE_KEY);
    if (!dismissedIds.includes(notificationId)) {
      dismissedIds.push(notificationId);
      saveStoredIds(DISMISSED_STORAGE_KEY, dismissedIds);
    }
    try {
      await api.post('/cms-chatbot/community/notifications/dismiss/', {
        notification_id: notificationId
      });
    } catch (err) {
      console.warn('API dismissNotification error:', err);
    }
  }
};

export default notificationService;

