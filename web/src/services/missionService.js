import api from '../lib/axios';

export const missionService = {
  /**
   * Fetch all active missions & challenges from database with user completion status.
   */
  async fetchMissions() {
    try {
      const response = await api.get('/challenging/missions/');
      return response.data?.results || [];
    } catch (error) {
      console.warn("Backend missions unreachable:", error);
      return [];
    }
  },

  /**
   * Complete a mission atomically in database and receive RE-Points.
   */
  async completeMission(missionId) {
    try {
      const response = await api.post(`/challenging/missions/${missionId}/complete/`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Không thể hoàn thành nhiệm vụ lúc này.";
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Fetch real user eco stats (points, km, trash kg, rank) directly from database.
   */
  async fetchUserEcoStats() {
    try {
      const response = await api.get('/gamification/stats/');
      return response.data;
    } catch (error) {
      console.warn("Backend eco stats unreachable:", error);
      return null;
    }
  },
};

export default missionService;

