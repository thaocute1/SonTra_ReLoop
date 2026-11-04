// Realtime Event Bus utilizing BroadcastChannel API with localStorage fallback
// Provides instant (<10ms) cross-tab / cross-window synchronization for PBL6 demo

const CHANNEL_NAME = 'sontra_reloop_realtime_bus';

class RealtimeEventBus {
  constructor() {
    this.channel = typeof window !== 'undefined' && 'BroadcastChannel' in window 
      ? new BroadcastChannel(CHANNEL_NAME) 
      : null;
    
    this.listeners = new Set();

    if (this.channel) {
      this.channel.onmessage = (event) => {
        if (event && event.data) {
          this.notifyListeners(event.data);
        }
      };
    }

    // Fallback: Listen to storage events for cross-tab sync
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'sontra_realtime_event' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.notifyListeners(data);
          } catch (err) {
            console.warn('Realtime bus storage parse error:', err);
          }
        }
      });
    }
  }

  notifyListeners(data) {
    this.listeners.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error('Realtime bus listener error:', err);
      }
    });
  }

  /**
   * Phát sự kiện realtime đến tất cả các tab/cửa sổ đang mở
   * @param {string} type - 'POST_CREATED' | 'POST_STATUS_CHANGED' | 'INCIDENT_REPORTED' | 'ORDER_BOOKED'
   * @param {object} payload - dữ liệu đính kèm
   */
  emit(type, payload = {}) {
    const message = {
      type,
      payload,
      timestamp: Date.now()
    };

    // 1. Gửi qua BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }

    // 2. Gửi qua localStorage event fallback
    try {
      localStorage.setItem('sontra_realtime_event', JSON.stringify(message));
    } catch (e) {}

    // 3. Thông báo cho các component trong cùng tab hiện tại
    this.notifyListeners(message);
  }

  /**
   * Đăng ký nhận sự kiện realtime
   * @param {function} callback
   * @returns {function} unsubscribe
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const realtimeBus = new RealtimeEventBus();
export default realtimeBus;

