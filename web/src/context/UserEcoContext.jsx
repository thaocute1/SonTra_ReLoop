import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../features/auth/api/authService';
import missionService from '../services/missionService';

const UserEcoContext = createContext(null);

export function UserEcoProvider({ children }) {
  // Clear legacy mock localStorage keys
  useEffect(() => {
    localStorage.removeItem('user_eco_tasks');
    localStorage.removeItem('user_eco_points');
  }, []);

  // 1. User Profile from localStorage (persisted on real login)
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user_info');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const name = parsed.name || parsed.email?.split('@')[0] || 'Du Khách Sơn Trà';
        const initials = name
          .split(' ')
          .filter(Boolean)
          .map(n => n[0])
          .slice(-2)
          .join('')
          .toUpperCase() || 'ST';
        return {
          ...parsed,
          name,
          avatarText: initials,
          avatarUrl: parsed.avatar_url || ''
        };
      } catch (e) {
        // fallback
      }
    }
    return null;
  });

  // 2. Eco Stats from Database (Defaults to 0, no mock numbers)
  const [ecoStats, setEcoStats] = useState(() => {
    const saved = localStorage.getItem('user_eco_stats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.points === 'number' && parsed.points >= 0) {
          return parsed;
        }
      } catch (e) {}
    }
    return {
      points: user?.total_eco_points || 0,
      totalKm: 0,
      totalTrashKg: 0,
      rank: '#1 Eco-Guardian',
      rankNumber: 1
    };
  });

  // 3. Missions / Tasks from Database
  const [tasks, setTasks] = useState([]);
  const [isLoadingEco, setIsLoadingEco] = useState(true);

  // Sync state with Database on mount
  const refreshEcoData = useCallback(async () => {
    try {
      setIsLoadingEco(true);

      // Concurrent fetch: Profile, Eco Stats, Missions
      const [profileData, statsData, missionsData] = await Promise.all([
        authService.getProfile().catch(() => null),
        missionService.fetchUserEcoStats().catch(() => null),
        missionService.fetchMissions().catch(() => [])
      ]);

      if (profileData) {
        const name = profileData.name || profileData.email?.split('@')[0] || 'Du Khách Sơn Trà';
        const initials = name
          .split(' ')
          .filter(Boolean)
          .map(n => n[0])
          .slice(-2)
          .join('')
          .toUpperCase() || 'ST';
        
        setUser({
          ...profileData,
          name,
          avatarText: initials,
          avatarUrl: profileData.avatar_url || ''
        });
      }

      if (statsData) {
        const freshStats = {
          points: statsData.points ?? 0,
          totalKm: statsData.total_km ?? 0,
          totalTrashKg: statsData.total_trash_kg ?? 0,
          rank: statsData.rank || '#1 Eco-Guardian',
          rankNumber: statsData.rank_number || 1
        };
        setEcoStats(freshStats);
        localStorage.setItem('user_eco_stats', JSON.stringify(freshStats));
      } else if (profileData?.total_eco_points !== undefined) {
        setEcoStats(prev => ({
          ...prev,
          points: profileData.total_eco_points
        }));
      }

      if (Array.isArray(missionsData)) {
        setTasks(missionsData);
      }
    } catch (err) {
      console.warn("Could not sync eco data with backend:", err);
    } finally {
      setIsLoadingEco(false);
    }
  }, []);

  useEffect(() => {
    refreshEcoData();
  }, [refreshEcoData]);

  // Actions that update state & persist
  const updatePoints = useCallback((newPoints) => {
    setEcoStats(prev => {
      const updated = { ...prev, points: newPoints };
      localStorage.setItem('user_eco_stats', JSON.stringify(updated));
      return updated;
    });
    setUser(prev => prev ? { ...prev, total_eco_points: newPoints } : prev);
  }, []);

  const addPoints = useCallback((amount) => {
    setEcoStats(prev => {
      const updated = { ...prev, points: prev.points + amount };
      localStorage.setItem('user_eco_stats', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deductPoints = useCallback((amount) => {
    setEcoStats(prev => {
      const updated = { ...prev, points: Math.max(0, prev.points - amount) };
      localStorage.setItem('user_eco_stats', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Complete mission via Backend DRF API
  const completeTask = useCallback(async (taskId) => {
    try {
      const res = await missionService.completeMission(taskId);
      if (res.success) {
        const { new_total_points, message } = res.data;
        
        // Update Points everywhere
        updatePoints(new_total_points);

        // Update Task locally
        setTasks(prev => prev.map(t => {
          if (t.id === taskId) {
            return {
              ...t,
              status: 'completed',
              progress: 100,
              completedDate: new Date().toLocaleDateString('vi-VN')
            };
          }
          return t;
        }));

        return { success: true, message, new_total_points };
      }
      return { success: false, error: res.error };
    } catch (e) {
      return { success: false, error: "Lỗi kết nối máy chủ khi hoàn thành nhiệm vụ." };
    }
  }, [updatePoints]);

  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;
  const totalTasksCount = tasks.length;

  return (
    <UserEcoContext.Provider
      value={{
        user,
        setUser,
        ecoStats,
        setEcoStats,
        points: ecoStats.points,
        totalKm: ecoStats.totalKm,
        totalTrashKg: ecoStats.totalTrashKg,
        rank: ecoStats.rank,
        rankNumber: ecoStats.rankNumber,
        tasks,
        setTasks,
        completedTasksCount,
        totalTasksCount,
        isLoadingEco,
        refreshEcoData,
        updatePoints,
        addPoints,
        deductPoints,
        completeTask
      }}
    >
      {children}
    </UserEcoContext.Provider>
  );
}

export function useUserEco() {
  const context = useContext(UserEcoContext);
  if (!context) {
    return {
      user: null,
      ecoStats: { points: 0, totalKm: 0, totalTrashKg: 0, rank: '#1 Eco-Guardian', rankNumber: 1 },
      points: 0,
      totalKm: 0,
      totalTrashKg: 0,
      rank: '#1 Eco-Guardian',
      rankNumber: 1,
      tasks: [],
      completedTasksCount: 0,
      totalTasksCount: 0,
      isLoadingEco: false,
      refreshEcoData: () => {},
      updatePoints: () => {},
      addPoints: () => {},
      deductPoints: () => {},
      completeTask: async () => ({ success: false })
    };
  }
  return context;
}
