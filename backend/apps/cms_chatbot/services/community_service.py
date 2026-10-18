import datetime
from django.utils import timezone


class CommunityService:
    # Kho dữ liệu bài đăng cộng đồng đa tác nhân
    _mock_posts = [
        # --- BÀI ĐĂNG CỦA BAN QUẢN LÝ (BQL ADMIN) ---
        {
            "id": 101,
            "author_id": 999,
            "author_name": "Ban Quản Lý Bán Đảo Sơn Trà",
            "author_initials": "BQL",
            "author_role": "admin",
            "role_badge": "🛡️ Ban Quản Lý (Chính Thống)",
            "post_type": "bql_alert",
            "title": "Cảnh báo nguy cơ sạt lở đá đoạn dốc Hoàng Sa - Tạm dừng tuyến Mũi Nghê",
            "content": "Do ảnh hưởng của đợt mưa lớn rạng sáng nay, tại Km 4+200 tuyến đường nhánh xuống Mũi Nghê xuất hiện một số điểm đá lăn nhỏ. Để đảm bảo an toàn tuyệt đối cho du khách, BQL tạm thời rào chắn cảnh báo tuyến này đến hết ngày 20/10. Các tuyến Đỉnh Bàn Cờ và Cây Đa Di Sản vẫn hoạt động bình thường dưới sự hướng dẫn của kiểm lâm.",
            "thumbnail_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
            "collected_kg": 0.0,
            "location_tag": "Tuyến Mũi Nghê - Dốc Hoàng Sa",
            "points_reward": "",
            "tour_id": None,
            "tour_title": "",
            "tour_price": "",
            "is_pinned": True,
            "alert_level": "warning",
            "likes_count": 89,
            "is_liked": False,
            "comments_count": 14,
            "comments": [
                {
                    "id": "c1",
                    "post_id": 101,
                    "author_name": "Trần Văn An",
                    "author_initials": "AN",
                    "content": "Cảm ơn BQL đã kịp thời cảnh báo, cuối tuần này mình sẽ chuyển sang đi tuyến Cây Đa!",
                    "created_at": "1 giờ trước"
                }
            ],
            "created_at": "Hôm nay, 07:15",
            "time_ago": "2 giờ trước"
        },
        {
            "id": 102,
            "author_id": 999,
            "author_name": "Ban Quản Lý Bán Đảo Sơn Trà",
            "author_initials": "BQL",
            "author_role": "admin",
            "role_badge": "🛡️ Ban Quản Lý (Chính Thống)",
            "post_type": "bql_alert",
            "title": "Đã xử lý dọn dẹp sạch sẽ bãi rác tự phát tại Bãi Rạng sau phản ánh #REP104",
            "content": "Sau khi tiếp nhận báo cáo sự cố kèm định vị GPS từ du khách qua ứng dụng Sơn Trà ReLoop, Đội Tuần Tra Kiểm Lâm đã phối hợp cùng đoàn thanh niên thu gom hơn 45 kg chai nhựa và túi nilon tại khu vực bờ đá Bãi Rạng. Trân trọng cảm ơn tinh thần bảo vệ môi trường của cộng đồng!",
            "thumbnail_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
            "collected_kg": 45.0,
            "location_tag": "Bãi Rạng - Bán đảo Sơn Trà",
            "points_reward": "Đã xử lý xong",
            "tour_id": None,
            "tour_title": "",
            "tour_price": "",
            "is_pinned": False,
            "alert_level": "success",
            "likes_count": 142,
            "is_liked": True,
            "comments_count": 22,
            "comments": [],
            "created_at": "Hôm qua, 16:30",
            "time_ago": "1 ngày trước"
        },

        # --- BÀI ĐĂNG CỦA ĐỐI TÁC LỮ HÀNH (VENDOR TOUR) ---
        {
            "id": 201,
            "author_id": 12,
            "author_name": "Green Trek Son Tra",
            "author_initials": "GT",
            "author_role": "vendor",
            "role_badge": "✓ Đối Tác Lữ Hành Xác Thực",
            "post_type": "vendor_promo",
            "title": "Mở thêm 5 suất trải nghiệm 'Chinh phục Đỉnh Bàn Cờ - Ngắm Hoàng Hôn' cuối tuần này!",
            "content": "Green Trek vừa mở thêm 1 chuyến khởi hành đặc biệt vào Thứ 7 tuần này (25/10), có Eco-Guide chuyên sâu về đàn Voọc Chà Vá Chân Nâu đồng hành. 10% doanh thu mỗi vé sẽ được tự động trích nộp vào Quỹ Bảo Tồn Bán Đảo Sơn Trà. Nhanh tay đăng ký trước khi hết chỗ nhé các Eco-Explorers!",
            "thumbnail_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80",
            "collected_kg": 0.0,
            "location_tag": "Đỉnh Bàn Cờ",
            "points_reward": "Cam kết 10% Quỹ ESG",
            "tour_id": 1,
            "tour_title": "Chinh phục Đỉnh Bàn Cờ - Ngắm Hoàng Hôn",
            "tour_price": "382.500 đ / người (Giảm 15%)",
            "is_pinned": False,
            "alert_level": "info",
            "likes_count": 68,
            "is_liked": False,
            "comments_count": 9,
            "comments": [
                {
                    "id": "c2",
                    "post_id": 201,
                    "author_name": "Lê Minh Quân",
                    "author_initials": "MQ",
                    "content": "Cho mình hỏi đoàn có trang bị gậy trekking và ống nhòm chuyên dụng không ạ?",
                    "created_at": "30 phút trước"
                }
            ],
            "created_at": "Hôm nay, 09:20",
            "time_ago": "3 giờ trước"
        },
        {
            "id": 202,
            "author_id": 15,
            "author_name": "Sơn Trà Eco Adventure",
            "author_initials": "EA",
            "author_role": "vendor",
            "role_badge": "✓ Đối Tác Lữ Hành Xác Thực",
            "post_type": "vendor_promo",
            "title": "Hành trình cùng 12 du khách nhặt rác làm sạch đường mòn Cây Đa Di Sản",
            "content": "Sáng nay đoàn khách của Eco Adventure đã xuất sắc hoàn thành cung đường 3.8 km và thu gom được 8.5 kg rác vô cơ dọc đường mòn. Mỗi thành viên đều được cộng 85 RE-Points vào tài khoản Sơn Trà ReLoop. Cảm ơn các bạn đã cùng chúng tôi giữ gìn màu xanh của Sơn Trà!",
            "thumbnail_url": "https://images.unsplash.com/photo-1511497584788-876761c11969?auto=format&fit=crop&w=800&q=80",
            "collected_kg": 8.5,
            "location_tag": "Rừng Cây Đa Ngàn Năm",
            "points_reward": "+85 RE-Points",
            "tour_id": 2,
            "tour_title": "Khám phá Rừng Cây Đa ngàn năm Sơn Trà",
            "tour_price": "380.000 đ",
            "is_pinned": False,
            "alert_level": "info",
            "likes_count": 95,
            "is_liked": True,
            "comments_count": 7,
            "comments": [],
            "created_at": "Hôm qua, 11:00",
            "time_ago": "1 ngày trước"
        },

        # --- BÀI ĐĂNG CỦA DU KHÁCH (USER STORY) ---
        {
            "id": 301,
            "author_id": 5,
            "author_name": "Thảo Trần",
            "author_initials": "TH",
            "author_role": "tourist",
            "role_badge": "🏅 Top 4 Eco-Hero",
            "post_type": "user_story",
            "title": "Cung đường Đỉnh Bàn Cờ sáng nay tuyệt đẹp!",
            "content": "Không khí sớm tinh mơ trên Đỉnh Bàn Cờ cực kỳ trong lành. Dọc đường đi nhóm mình đã nhặt thêm được 2.4 kg vỏ chai và túi nilon ở trạm dừng chân số 2. Đã bỏ đúng thùng rác phân loại của ban quản lý. Cảm giác vừa tập thể dục vừa làm điều có ích thật tuyệt vời!",
            "thumbnail_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80",
            "collected_kg": 2.4,
            "location_tag": "Đỉnh Bàn Cờ",
            "points_reward": "+24 RE-Points",
            "tour_id": None,
            "tour_title": "",
            "tour_price": "",
            "is_pinned": False,
            "alert_level": "info",
            "likes_count": 38,
            "is_liked": False,
            "comments_count": 5,
            "comments": [
                {
                    "id": "c3",
                    "post_id": 301,
                    "author_name": "Phạm Quốc Trí",
                    "author_initials": "TR",
                    "content": "Hoan hô bạn Thảo! Sơn Trà rất cần những hành động đẹp như thế này.",
                    "created_at": "15 phút trước"
                }
            ],
            "created_at": "Hôm nay, 08:45",
            "time_ago": "4 giờ trước"
        },
        {
            "id": 302,
            "author_id": 8,
            "author_name": "Thành Dương",
            "author_initials": "TD",
            "author_role": "tourist",
            "role_badge": "🌿 Tình Nguyện Viên Xanh",
            "post_type": "user_story",
            "title": "Chiến dịch gom rác nhựa tại Bãi Nam cùng nhóm bạn",
            "content": "Cuối tuần tụi mình tổ chức trekking nhẹ nhàng kết hợp mang theo bao tải sinh học để nhặt rác. Thành quả thu được hơn 6 kg rác thải trôi dạt vào bãi đá. Mọi người đi chơi nhớ mang rác về lại thành phố nhé, đừng để lại gì ngoài những dấu chân!",
            "thumbnail_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
            "collected_kg": 6.2,
            "location_tag": "Bãi Nam",
            "points_reward": "+62 RE-Points",
            "tour_id": None,
            "tour_title": "",
            "tour_price": "",
            "is_pinned": False,
            "alert_level": "info",
            "likes_count": 64,
            "is_liked": True,
            "comments_count": 11,
            "comments": [],
            "created_at": "Hôm qua, 15:20",
            "time_ago": "1 ngày trước"
        }
    ]

    # Bảng xếp hạng Eco-Hero tháng này
    _mock_leaderboard = [
        {
            "rank": 1,
            "rankBadgeBg": "bg-[#E67E22]",
            "initials": "TR",
            "name": "Phạm Quốc Trí",
            "stats": "18.2 km · 6.4 kg rác",
            "points": 480,
            "badge": "Vua Rừng Sơn Trà"
        },
        {
            "rank": 2,
            "rankBadgeBg": "bg-[#2D3732]",
            "initials": "AN",
            "name": "Nguyễn Văn An",
            "stats": "15.7 km · 5.1 kg rác",
            "points": 395,
            "badge": "Chiến Binh Voọc"
        },
        {
            "rank": 3,
            "rankBadgeBg": "bg-[#3B5A45]",
            "initials": "PH",
            "name": "Nguyễn Tuấn Phong",
            "stats": "14.3 km · 4.6 kg rác",
            "points": 350,
            "badge": "Người Bảo Vệ Xanh"
        },
        {
            "rank": 4,
            "rankBadgeBg": "bg-[#8DA696]",
            "initials": "TH",
            "name": "Thảo Trần",
            "stats": "12.1 km · 3.8 kg rác",
            "points": 310,
            "badge": "Eco-Explorer"
        },
        {
            "rank": 5,
            "rankBadgeBg": "bg-[#8DA696]",
            "initials": "LI",
            "name": "Hoàng Thùy Linh",
            "stats": "9.5 km · 2.9 kg rác",
            "points": 240,
            "badge": "Eco-Explorer"
        }
    ]

    # Chiến dịch dọn dẹp cộng đồng sắp diễn ra
    _mock_cleanup_events = [
        {
            "id": 1,
            "title": "Chủ Nhật Xanh - Làm Sạch Bãi Nam",
            "organizer": "BQL Bán Đảo Sơn Trà & CLB Eco Trek",
            "event_date": "25/10/2026 (06:30 - 10:00)",
            "target_kg": "100 kg rác nhựa",
            "participants_count": 28,
            "max_participants": 40,
            "reward_points": "+100 RE-Points",
            "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80"
        },
        {
            "id": 2,
            "title": "Hành Trình Xanh Rừng Cây Đa Di Sản",
            "organizer": "Green Trek Son Tra & Tình Nguyện Viên",
            "event_date": "01/11/2026 (07:00 - 11:30)",
            "target_kg": "60 kg rác vỏ lon",
            "participants_count": 16,
            "max_participants": 30,
            "reward_points": "+80 RE-Points",
            "image": "https://images.unsplash.com/photo-1511497584788-876761c11969?auto=format&fit=crop&w=400&q=80"
        }
    ]

    # Danh sách sự cố môi trường đã tiếp nhận (KH-12)
    _mock_incidents = [
        {
            "id": "REP104",
            "reporter_name": "Lê Tuấn Tú",
            "incident_type": "Bãi rác tự phát lớn",
            "location_name": "Bờ đá Bãi Rạng",
            "description": "Rác chai nhựa và túi nilon do du khách cắm trại tự do để lại bốc mùi khó chịu.",
            "status": "resolved",
            "status_label": "Đã dọn dẹp xong",
            "points_awarded": 50,
            "created_at": "16/10/2026"
        },
        {
            "id": "REP105",
            "reporter_name": "Thảo Trần",
            "incident_type": "Dấu hiệu bẫy thú rừng",
            "location_name": "Đoạn dốc gần Mũi Nghê",
            "description": "Phát hiện dây bẫy thép buộc vào gốc cây gần lối đi.",
            "status": "investigating",
            "status_label": "Kiểm lâm đang xử lý",
            "points_awarded": 0,
            "created_at": "17/10/2026"
        }
    ]

    @classmethod
    def get_feed(cls, feed_type='all', location_tag=None):
        """
        Lọc danh sách bài đăng theo Tab tác nhân:
        - 'all': Tất cả bài viết, ưu tiên bài Ghim (is_pinned) lên đầu
        - 'user': Chỉ bài của du khách ('user_story')
        - 'vendor': Chỉ bài của đối tác lữ hành ('vendor_promo')
        - 'bql': Chỉ bài của Ban Quản Lý ('bql_alert', 'cleanup_event')
        """
        posts = cls._mock_posts.copy()

        if feed_type == 'user':
            posts = [p for p in posts if p.get('author_role') == 'tourist']
        elif feed_type == 'vendor':
            posts = [p for p in posts if p.get('author_role') == 'vendor']
        elif feed_type == 'bql':
            posts = [p for p in posts if p.get('author_role') == 'admin']

        if location_tag and location_tag != 'all':
            posts = [p for p in posts if location_tag.lower() in p.get('location_tag', '').lower()]

        # Sắp xếp: Pinned lên đầu, sau đó theo ID giảm dần (mới nhất)
        posts.sort(key=lambda x: (not x.get('is_pinned', False), -x['id']))
        return posts

    @classmethod
    def create_post(cls, author_user, data):
        """
        Tạo bài đăng mới cho cộng đồng:
        - Tự động cộng RE-Points vào tài khoản nếu du khách nhập số kg rác thu gom
        """
        post_id = max([p['id'] for p in cls._mock_posts], default=400) + 1
        
        # Xác định tác nhân
        role = getattr(author_user, 'role', 'tourist') if author_user else 'tourist'
        user_name = getattr(author_user, 'name', 'Eco-Explorer') if author_user else 'Eco-Explorer'
        initials = ''.join([part[0] for part in user_name.split() if part])[:2].upper() or 'EE'

        role_badge = "🌿 Du Khách Sinh Thái"
        if role == 'vendor':
            role_badge = "✓ Đối Tác Lữ Hành Xác Thực"
        elif role == 'admin':
            role_badge = "🛡️ Ban Quản Lý (Chính Thống)"

        collected_kg = float(data.get('collected_kg', 0.0) or 0.0)
        points_reward = ""
        if collected_kg > 0:
            points = int(collected_kg * 10)
            points_reward = f"+{points} RE-Points"

        new_post = {
            "id": post_id,
            "author_id": getattr(author_user, 'id', 1) if author_user else 1,
            "author_name": user_name,
            "author_initials": initials,
            "author_role": role,
            "role_badge": role_badge,
            "post_type": data.get('post_type', 'user_story'),
            "title": data.get('title', ''),
            "content": data.get('content', ''),
            "thumbnail_url": data.get('thumbnail_url') or "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80",
            "collected_kg": collected_kg,
            "location_tag": data.get('location_tag', 'Bán đảo Sơn Trà'),
            "points_reward": points_reward,
            "tour_id": data.get('tour_id'),
            "tour_title": data.get('tour_title', ''),
            "tour_price": data.get('tour_price', ''),
            "is_pinned": data.get('is_pinned', False),
            "alert_level": data.get('alert_level', 'info'),
            "likes_count": 0,
            "is_liked": False,
            "comments_count": 0,
            "comments": [],
            "created_at": "Vừa xong",
            "time_ago": "Vừa xong"
        }

        cls._mock_posts.insert(0, new_post)
        return new_post

    @classmethod
    def toggle_like(cls, post_id, user_id=None):
        for post in cls._mock_posts:
            if post['id'] == post_id:
                post['is_liked'] = not post['is_liked']
                post['likes_count'] += 1 if post['is_liked'] else -1
                return post
        return None

    @classmethod
    def add_comment(cls, post_id, author_name, content):
        for post in cls._mock_posts:
            if post['id'] == post_id:
                cmt_id = f"c{len(post['comments']) + 1}"
                initials = ''.join([p[0] for p in author_name.split() if p])[:2].upper() or 'US'
                cmt = {
                    "id": cmt_id,
                    "post_id": post_id,
                    "author_name": author_name,
                    "author_initials": initials,
                    "content": content,
                    "created_at": "Vừa xong"
                }
                post['comments'].append(cmt)
                post['comments_count'] = len(post['comments'])
                return cmt
        return None

    @classmethod
    def get_leaderboard(cls):
        return cls._mock_leaderboard

    @classmethod
    def get_cleanup_events(cls):
        return cls._mock_cleanup_events

    @classmethod
    def get_impact_counter(cls):
        """
        Đồng hồ tác động sinh thái toàn bán đảo Sơn Trà
        """
        total_kg = sum([p.get('collected_kg', 0) for p in cls._mock_posts]) + 1350.0
        return {
            "total_trash_collected_kg": round(total_kg, 1),
            "total_green_distance_km": 12580,
            "total_doucs_protected_checkins": 945,
            "total_incidents_resolved": 38,
            "total_active_explorers": 1420
        }

    @classmethod
    def report_incident(cls, reporter_user, data):
        """
        Tạo báo cáo sự cố thực địa (KH-12)
        """
        inc_id = f"REP{len(cls._mock_incidents) + 101}"
        user_name = getattr(reporter_user, 'name', 'Eco-Explorer') if reporter_user else 'Eco-Explorer'
        
        incident = {
            "id": inc_id,
            "reporter_name": user_name,
            "incident_type": data.get('incident_type', 'Rác thải ô nhiễm'),
            "location_name": data.get('location_name', 'Bán đảo Sơn Trà'),
            "description": data.get('description', ''),
            "photo_url": data.get('photo_url', ''),
            "status": "pending",
            "status_label": "Chờ BQL tiếp nhận",
            "points_awarded": 0,
            "created_at": datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
        }
        cls._mock_incidents.insert(0, incident)
        return incident

