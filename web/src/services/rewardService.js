import api from '../lib/axios';

export const rewardService = {
  /**
   * Fetch all active vouchers and eco-gifts available for redemption.
   */
  async fetchRewards() {
    try {
      const response = await api.get('/gamification/rewards/');
      return response.data?.results || [];
    } catch (error) {
      console.warn("Backend rewards unreachable, using fallback:", error);
      return null;
    }
  },

  /**
   * Redeem a reward (voucher or gift) atomically in database.
   * Deducts user points, issues a UserVoucher, and writes to PointsLedger.
   */
  async redeemReward(voucherId) {
    try {
      const response = await api.post('/gamification/rewards/redeem/', {
        voucher_id: voucherId,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.voucher_id ||
        error.response?.data?.detail ||
        "Đổi thưởng không thành công. Vui lòng thử lại sau.";
      return {
        success: false,
        error: typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage,
      };
    }
  },

  /**
   * Fetch all vouchers and gift redemption cards owned by the authenticated user.
   */
  async fetchMyVouchers() {
    try {
      const response = await api.get('/gamification/my-vouchers/');
      return response.data?.results || [];
    } catch (error) {
      console.warn("Backend my-vouchers unreachable, using fallback:", error);
      return null;
    }
  },

  /**
   * Fetch the user's transparent points activity ledger timeline.
   */
  async fetchPointsLedger() {
    try {
      const response = await api.get('/gamification/points-ledger/');
      return response.data?.results || [];
    } catch (error) {
      console.warn("Backend points-ledger unreachable, using fallback:", error);
      return null;
    }
  },
};

export default rewardService;

