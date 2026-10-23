import React, { createContext, useContext, useState, useEffect } from 'react';

// Dữ liệu mẫu khởi tạo chuẩn hóa đồng bộ 100% cho toàn bộ phân hệ người dùng
const INITIAL_USER = {
  name: 'Phong Nguyễn',
  email: 'phong.nguyen@example.com',
  avatarText: 'PN',
  avatarUrl: '',
  role: 'Eco-Champion Sơn Trà'
};

const INITIAL_ECO_STATS = {
  points: 240,            // 240 RE-Points
  totalKm: 14.5,          // 14.5 km trekking bảo tồn
  totalTrashKg: 4.8,      // 4.8 kg rác nhựa đã thu gom
  rank: '#3 Eco-Hero',    // Thứ hạng sinh thái
  rankNumber: 3
};

const INITIAL_WEEKLY_TASKS = [
  {
    id: 1,
    title: 'Nhặt rác tại Bãi Bụt',
    points: 50,
    status: 'completed',  // Đã xong
    progress: 100,
    tag: 'Bảo tồn biển',
    desc: 'Thu gom tối thiểu 2kg rác nhựa trên bờ cát Bãi Bụt và phân loại đúng quy định.',
    completedDate: '20/10/2026',
    proofUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 2,
    title: 'Check-in GPS Đỉnh Bàn Cờ',
    points: 100,
    status: 'completed',  // Đã xong
    progress: 100,
    tag: 'Trekking Sơn Trà',
    desc: 'Chinh phục chặng dốc Hoàng Sa lên Đỉnh Bàn Cờ và quét mã QR tại trạm kiểm soát.',
    completedDate: '21/10/2026',
    proofUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 3,
    title: 'Quan sát Voọc chà vá chân nâu',
    points: 90,
    status: 'in_progress', // Đang làm
    progress: 50,
    tag: 'Đa dạng sinh học',
    desc: 'Chụp ảnh có gắn tọa độ GPS loài linh trưởng đặc hữu Sơn Trà và báo cáo vị trí.',
    completedDate: null,
    proofUrl: null
  }
];

const UserEcoContext = createContext(null);

export function UserEcoProvider({ children }) {
  // 1. User Profile
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user_info');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const name = parsed.name || INITIAL_USER.name;
        return {
          ...INITIAL_USER,
          ...parsed,
          avatarText: name.split(' ').map(n => n[0]).slice(-2).join('').toUpperCase() || 'PN'
        };
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_USER;
  });

  // 2. Eco Stats (Thống nhất 100% giữa các trang)
  const [ecoStats, setEcoStats] = useState(() => {
    const saved = localStorage.getItem('user_eco_stats');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_ECO_STATS;
  });

  // 3. Weekly Tasks
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('user_eco_tasks');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_WEEKLY_TASKS;
  });

  // Lưu tự động vào localStorage khi có cập nhật
  useEffect(() => {
    localStorage.setItem('user_eco_stats', JSON.stringify(ecoStats));
  }, [ecoStats]);

  useEffect(() => {
    localStorage.setItem('user_eco_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Các actions
  const addPoints = (amount) => {
    setEcoStats(prev => ({ ...prev, points: prev.points + amount }));
  };

  const deductPoints = (amount) => {
    setEcoStats(prev => ({ ...prev, points: Math.max(0, prev.points - amount) }));
  };

  const completeTask = (taskId) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        addPoints(t.points);
        return { ...t, status: 'completed', progress: 100, completedDate: 'Hôm nay' };
      }
      return t;
    }));
  };

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
        completedTasksCount,
        totalTasksCount,
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
    // An toàn nếu gọi ngoài Provider
    return {
      user: INITIAL_USER,
      ecoStats: INITIAL_ECO_STATS,
      points: INITIAL_ECO_STATS.points,
      totalKm: INITIAL_ECO_STATS.totalKm,
      totalTrashKg: INITIAL_ECO_STATS.totalTrashKg,
      rank: INITIAL_ECO_STATS.rank,
      rankNumber: INITIAL_ECO_STATS.rankNumber,
      tasks: INITIAL_WEEKLY_TASKS,
      completedTasksCount: 2,
      totalTasksCount: 3,
      addPoints: () => {},
      deductPoints: () => {},
      completeTask: () => {}
    };
  }
  return context;
}

