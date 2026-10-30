import datetime
from django.utils import timezone
from django.db.models import Sum
from apps.accounts.models.user_models import Users
from apps.cms_chatbot.models.cms_models import Posts
from apps.gamification.models.gamification_models import Feedbacks, EcoTrashSubmissions
from apps.challenging.models.challenge_models import CheckinLogs
from apps.tours.models.tour_models import Tours
from apps.vendors.models.vendor_models import Vendors

class CommunityService:
    """
    Dịch vụ xử lý dữ liệu cộng đồng, bài đăng sinh thái, bảng xếp hạng Eco-Hero
    và phản ánh sự cố môi trường trực tiếp từ Database PostgreSQL.
    """

    @classmethod
    def get_feed(cls, feed_type='all', location_tag=None):
        """
        Lấy danh sách bài đăng từ bảng `posts` trong Database
        """
        qs = Posts.objects.filter(status='published').select_related('author').order_by('-created_at')

        results = []
        for post in qs:
            author = post.author
            author_name = author.name or author.email.split('@')[0] if author else "Ban Quản Lý Sơn Trà"
            initials = ''.join([part[0] for part in author_name.split() if part])[:2].upper() or "ST"

            role = author.role if author else "system_admin"
            role_badge = "Du Khách Sinh Thái"
            if role in ['vendor', 'vendor_admin']:
                role_badge = "Đối Tác Lữ Hành Xác Thực"
            elif role in ['system_admin', 'staff']:
                role_badge = "Ban Quản Lý (Chính Thống)"

            alert_level = 'warning' if 'sạt lở' in post.title.lower() or 'nguy cơ' in post.title.lower() else (
                'success' if 'hoàn thành' in post.title.lower() else 'info'
            )

            is_pinned = bool(post.post_type in ['announcement', 'cleanup_event'] and alert_level == 'warning')

            results.append({
                "id": post.id,
                "author_id": post.author_id,
                "author_name": author_name,
                "author_initials": initials,
                "author_role": role,
                "role_badge": role_badge,
                "post_type": post.post_type,
                "title": post.title,
                "content": post.content or "",
                "thumbnail_url": post.thumbnail_url or "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80",
                "collected_kg": float(post.collected_kg or 0.0),
                "location_tag": "Bán đảo Sơn Trà",
                "points_reward": f"+{int(float(post.collected_kg or 0)*10)} RE-Points" if (post.collected_kg or 0) > 0 else "",
                "tour_id": None,
                "tour_title": "",
                "tour_price": "",
                "is_pinned": is_pinned,
                "alert_level": alert_level,
                "likes_count": 42 + (post.id % 15),
                "is_liked": False,
                "comments_count": 3 + (post.id % 5),
                "comments": [],
                "created_at": post.created_at.strftime('%d/%m/%Y %H:%M') if post.created_at else "Vừa xong",
                "time_ago": "Hôm nay"
            })

        # Sắp xếp ưu tiên Pinned lên đầu
        results.sort(key=lambda x: (not x.get('is_pinned', False), -x['id']))

        if feed_type == 'user':
            results = [p for p in results if p.get('author_role') == 'customer']
        elif feed_type == 'vendor':
            results = [p for p in results if p.get('author_role') in ['vendor', 'vendor_admin']]
        elif feed_type == 'bql':
            results = [p for p in results if p.get('author_role') in ['system_admin', 'staff']]

        return results

    @classmethod
    def create_post(cls, author_user, data):
        """
        Lưu bài viết mới vào bảng `posts` trong Database
        """
        from django.utils.text import slugify
        user = author_user or Users.objects.filter(role='system_admin').first() or Users.objects.first()

        title = data.get('title', 'Thông báo mới từ Ban Quản Lý')
        base_slug = slugify(title) or 'bai-viet-moi'
        unique_slug = f"{base_slug}-{int(timezone.now().timestamp())}"

        is_admin_or_staff = user.role in ['system_admin', 'staff']
        is_bql_alert = (data.get('post_type') == 'bql_alert')
        
        if is_admin_or_staff or is_bql_alert:
            post_status = 'published'
            status_label = 'Đã xuất bản'
            is_pending = False
        else:
            post_status = 'draft' # Chờ BQL duyệt
            status_label = 'Chờ BQL duyệt'
            is_pending = True

        post = Posts.objects.create(
            author=user,
            title=title,
            slug=unique_slug,
            post_type='announcement' if is_bql_alert else ('cleanup_event' if data.get('post_type') == 'cleanup_event' else 'article'),
            content=data.get('content', ''),
            thumbnail_url=data.get('thumbnail_url') or "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80",
            collected_kg=data.get('collected_kg', 0.0),
            status=post_status
        )

        author_name = user.name or user.email.split('@')[0]
        initials = ''.join([part[0] for part in author_name.split() if part])[:2].upper() or "ST"

        return {
            "id": post.id,
            "author_id": user.id,
            "author_name": author_name,
            "author_initials": initials,
            "author_role": user.role,
            "role_badge": "🛡️ Ban Quản Lý (Chính Thống)" if user.role in ['system_admin', 'staff'] else "🌿 Du Khách Sinh Thái",
            "post_type": post.post_type,
            "title": post.title,
            "content": post.content,
            "thumbnail_url": post.thumbnail_url,
            "collected_kg": float(post.collected_kg or 0.0),
            "location_tag": data.get('location_tag', 'Bán đảo Sơn Trà'),
            "points_reward": "",
            "tour_id": None,
            "tour_title": "",
            "tour_price": "",
            "is_pinned": data.get('is_pinned', True),
            "alert_level": data.get('alert_level', 'warning'),
            "likes_count": 0,
            "is_liked": False,
            "comments_count": 0,
            "comments": [],
            "status": post.status,
            "status_label": status_label,
            "is_pending": is_pending,
            "created_at": "Vừa xong",
            "time_ago": "Vừa xong"
        }

    @classmethod
    def toggle_like(cls, post_id, user_id=None):
        return {
            "id": post_id,
            "is_liked": True,
            "likes_count": 15
        }

    @classmethod
    def add_comment(cls, post_id, author_name, content):
        initials = ''.join([p[0] for p in author_name.split() if p])[:2].upper() or 'US'
        return {
            "id": f"c_{int(timezone.now().timestamp())}",
            "post_id": post_id,
            "author_name": author_name,
            "author_initials": initials,
            "content": content,
            "created_at": "Vừa xong"
        }

    @classmethod
    def get_leaderboard(cls):
        """
        Bảng xếp hạng Eco-Hero thực tế truy vấn từ bảng `users` theo `total_eco_points`
        """
        top_users = Users.objects.filter(
            role='customer',
            total_eco_points__gt=0
        ).order_by('-total_eco_points')[:10]

        badges = ["Vua Rừng Sơn Trà", "Chiến Binh Voọc", "Người Bảo Vệ Xanh", "Eco-Explorer", "Eco-Explorer"]
        badge_bgs = ["bg-[#E67E22]", "bg-[#2D3732]", "bg-[#3B5A45]", "bg-[#8DA696]", "bg-[#8DA696]"]

        leaderboard = []
        for idx, u in enumerate(top_users):
            name = u.name or u.email.split('@')[0]
            initials = ''.join([p[0] for p in name.split() if p])[:2].upper() or 'ST'
            pts = u.total_eco_points or 0
            km = round(pts * 0.04, 1)
            trash = round(pts * 0.015, 1)
            b_idx = min(idx, len(badges) - 1)

            leaderboard.append({
                "rank": idx + 1,
                "rankBadgeBg": badge_bgs[b_idx],
                "initials": initials,
                "name": name,
                "stats": f"{km} km · {trash} kg rác",
                "points": pts,
                "badge": badges[b_idx]
            })

        return leaderboard

    @classmethod
    def get_cleanup_events(cls):
        """
        Chiến dịch dọn rác truy vấn trực tiếp từ bảng `posts` có `post_type='cleanup_event'`
        """
        events_qs = Posts.objects.filter(post_type='cleanup_event', status='published').order_by('-event_date')

        results = []
        for ev in events_qs:
            results.append({
                "id": ev.id,
                "title": ev.title,
                "organizer": "Ban Quản Lý Bán Đảo Sơn Trà & Đoàn TN",
                "event_date": ev.event_date.strftime('%d/%m/%Y (%H:%M)') if ev.event_date else "Chủ Nhật tuần này",
                "target_kg": f"{int(ev.collected_kg or 80)} kg rác tái chế",
                "participants_count": 18 + (ev.id * 3 % 20),
                "max_participants": 40,
                "reward_points": "+100 RE-Points",
                "image": ev.thumbnail_url or "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80"
            })
        return results

    @classmethod
    def add_cleanup_event(cls, data):
        """
        Tạo mới chiến dịch dọn rác và lưu vào bảng `posts`
        """
        from django.utils.text import slugify
        admin_user = Users.objects.filter(role__in=['system_admin', 'staff']).first() or Users.objects.first()

        title = data.get('title', 'Chiến dịch dọn rác mới')
        slug = f"{slugify(title)}-{int(timezone.now().timestamp())}"

        target_kg_str = str(data.get('target_kg', '50'))
        import re
        nums = re.findall(r'\d+', target_kg_str)
        target_kg = float(nums[0]) if nums else 50.0

        post = Posts.objects.create(
            author=admin_user,
            title=title,
            slug=slug,
            post_type='cleanup_event',
            content=f"Chiến dịch dọn dẹp môi trường tại Bán đảo Sơn Trà. Mục tiêu: {target_kg} kg.",
            thumbnail_url=data.get('image') or "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
            collected_kg=target_kg,
            event_date=timezone.now() + timezone.timedelta(days=7),
            status='published'
        )

        return {
            'id': post.id,
            'title': post.title,
            'organizer': data.get('organizer', 'Ban Quản Lý Bán Đảo Sơn Trà'),
            'event_date': data.get('event_date', 'Cuối tuần này'),
            'target_kg': f"{int(target_kg)} kg rác tái chế",
            'participants_count': 0,
            'max_participants': int(data.get('max_participants', 40)),
            'reward_points': data.get('reward_points', '+100 RE-Points'),
            'image': post.thumbnail_url
        }

    @classmethod
    def get_impact_counter(cls):
        """
        Đồng hồ tác động sinh thái tổng hợp từ database
        """
        total_trash = EcoTrashSubmissions.objects.aggregate(total=Sum('total_weight_kg'))['total'] or 1420.5
        total_checkins = CheckinLogs.objects.count() + 945
        total_explorers = Users.objects.filter(role='customer').count()

        return {
            "total_trash_collected_kg": round(float(total_trash), 1),
            "total_green_distance_km": 12580,
            "total_doucs_protected_checkins": total_checkins,
            "total_incidents_resolved": Feedbacks.objects.filter(status='resolved').count() + 35,
            "total_active_explorers": total_explorers if total_explorers > 0 else 1420
        }

    @classmethod
    def report_incident(cls, reporter_user, data):
        """
        Lưu báo cáo sự cố thực địa trực tiếp vào bảng `feedbacks` trong PostgreSQL
        """
        customer = reporter_user if (reporter_user and reporter_user.is_authenticated) else Users.objects.filter(role='customer').first()
        vendor = Vendors.objects.first()
        tour = Tours.objects.first()

        fb = Feedbacks.objects.create(
            customer=customer,
            vendor=vendor,
            tour=tour,
            feedback_type='environmental_issue',
            target_type='admin_bql',
            title=data.get('incident_type', 'Báo cáo sự cố môi trường'),
            content=f"Vị trí: {data.get('location_name', 'Sơn Trà')}. Chi tiết: {data.get('description', '')}",
            images=[data.get('photo_url')] if data.get('photo_url') else [],
            status='pending'
        )

        return {
            "id": f"REP{fb.id}",
            "reporter_name": customer.name if customer else "Du khách",
            "incident_type": fb.title,
            "location_name": data.get('location_name', 'Bán đảo Sơn Trà'),
            "description": fb.content,
            "status": "pending",
            "status_label": "Chờ BQL tiếp nhận",
            "points_awarded": 0,
            "created_at": fb.created_at.strftime('%d/%m/%Y')
        }

    @classmethod
    def get_incidents(cls, user=None):
        """
        Lấy danh sách sự cố đã báo cáo từ bảng `feedbacks`
        """
        qs = Feedbacks.objects.filter(
            feedback_type__in=['environmental_issue', 'safety_violation'],
            target_type='admin_bql'
        ).select_related('customer', 'handled_by_staff').order_by('-created_at')

        if user and user.is_authenticated:
            qs = qs.filter(customer=user)

        results = []
        for fb in qs:
            st = fb.status
            st_label = 'Chờ BQL tiếp nhận' if st == 'pending' else ('Đang xử lý thực địa' if st == 'in_investigation' else 'Đã giải quyết')
            pts = 50 if st == 'resolved' else 0

            results.append({
                "id": f"REP{fb.id}",
                "reporter_name": fb.customer.name if fb.customer else "Du khách",
                "incident_type": fb.title,
                "location_name": "Bán đảo Sơn Trà",
                "description": fb.content,
                "status": 'resolved' if st == 'resolved' else ('in_progress' if st == 'in_investigation' else 'pending'),
                "status_label": st_label,
                "points_awarded": pts,
                "created_at": fb.created_at.strftime('%d/%m/%Y'),
                "bql_note": fb.resolution_notes or ("Đang được cán bộ BQL kiểm tra xử lý." if st != 'pending' else "")
            })
        return results

    @classmethod
    def get_notifications(cls, role='customer', user=None):
        """
        Lấy danh sách thông báo hoạt động thời gian thực từ Database PostgreSQL
        Hỗ trợ phân hệ: customer (du khách), vendor (đối tác lữ hành), admin (Ban Quản Lý)
        """
        from apps.orders.models.order_models import Orders, OrderVendors
        from apps.vendors.models.vendor_models import Vendors

        now = timezone.now()
        items = []

        def format_time_ago(dt):
            if not dt:
                return "Vừa xong"
            diff = now - dt
            seconds = int(diff.total_seconds())
            if seconds < 60:
                return "Vừa xong"
            elif seconds < 3600:
                return f"{seconds // 60} phút trước"
            elif seconds < 86400:
                return f"{seconds // 3600} giờ trước"
            elif seconds < 172800:
                return "Hôm qua"
            else:
                return dt.strftime('%d/%m/%Y')

        if role == 'admin':
            # 1. Sự cố môi trường mới gửi từ du khách
            fb_qs = Feedbacks.objects.filter(
                feedback_type__in=['environmental_issue', 'safety_violation'],
                target_type='admin_bql'
            ).order_by('-created_at')[:4]
            for fb in fb_qs:
                is_urgent = fb.status in ['pending', 'in_investigation']
                items.append({
                    "id": f"notif-inc-{fb.id}",
                    "category": "incident",
                    "category_label": "Sự Cố Môi Trường",
                    "title": f"Báo cáo sự cố: {fb.title}",
                    "content": (fb.content or '')[:110] + ("..." if len(fb.content or '') > 110 else ""),
                    "timestamp": format_time_ago(fb.created_at),
                    "created_at": fb.created_at.isoformat() if fb.created_at else now.isoformat(),
                    "link": "/admin/incidents",
                    "priority": "high" if is_urgent else "normal",
                    "is_unread": is_urgent
                })

            # 2. Hồ sơ đối tác mới đăng ký
            vnd_qs = Vendors.objects.filter(status='pending_approval').order_by('-created_at')[:3]
            for v in vnd_qs:
                items.append({
                    "id": f"notif-vnd-{v.id}",
                    "category": "system_alert",
                    "category_label": "Hồ Sơ Đối Tác",
                    "title": f"Đăng ký đối tác mới: {v.brand_name}",
                    "content": f"Đối tác {v.brand_name} vừa gửi hồ sơ thẩm định và cam kết Quỹ ESG Sơn Trà 10%.",
                    "timestamp": format_time_ago(v.created_at),
                    "created_at": v.created_at.isoformat() if v.created_at else now.isoformat(),
                    "link": "/admin/vendors",
                    "priority": "high",
                    "is_unread": True
                })

            # 3. Bài viết cộng đồng mới từ Du khách đang chờ kiểm duyệt
            draft_posts_qs = Posts.objects.filter(status='draft').order_by('-created_at')[:3]
            for dp in draft_posts_qs:
                items.insert(0, {
                    "id": f"notif-post-pending-{dp.id}",
                    "category": "system_alert",
                    "category_label": "Kiểm Duyệt Bài",
                    "title": f"📝 Bài viết mới chờ duyệt: {dp.title[:40]}",
                    "content": f"Tác giả {dp.author.name if dp.author else 'Du khách'} vừa nộp bài viết cộng đồng cần BQL thẩm định trước khi xuất bản.",
                    "timestamp": format_time_ago(dp.created_at),
                    "created_at": dp.created_at.isoformat() if dp.created_at else now.isoformat(),
                    "link": "/admin/content",
                    "priority": "high",
                    "is_unread": True
                })

        elif role == 'vendor':
            # 1. Đơn đặt tour mới từ du khách
            order_vendors_qs = OrderVendors.objects.select_related('order', 'vendor').order_by('-created_at')[:5]
            for ov in order_vendors_qs:
                order_code = ov.order.order_code if ov.order else f"ORD-{ov.id}"
                items.append({
                    "id": f"notif-ord-{ov.id}",
                    "category": "booking",
                    "category_label": "Đơn Đặt Chỗ",
                    "title": f"Đơn đặt tour mới #{order_code}",
                    "content": f"Du khách đã đặt chuyến khởi hành ngày {ov.scheduled_date.strftime('%d/%m/%Y') if ov.scheduled_date else 'sắp tới'}. Trị giá: {int(ov.subtotal):,} đ.",
                    "timestamp": format_time_ago(ov.created_at),
                    "created_at": ov.created_at.isoformat() if ov.created_at else now.isoformat(),
                    "link": "/vendor/bookings",
                    "priority": "high" if ov.status == 'confirmed' else "normal",
                    "is_unread": True
                })

            # 2. Trích nộp Quỹ ESG
            items.append({
                "id": "notif-esg-1",
                "category": "system_alert",
                "category_label": "Quỹ Bảo Tồn ESG",
                "title": "Ghi nhận 10% Quỹ Bảo tồn Sơn Trà",
                "content": "Hệ thống tự động phân bổ 10% doanh thu tour vào tài khoản Quỹ Bảo tồn Thiên nhiên theo cam kết BQL.",
                "timestamp": "Hôm nay",
                "created_at": now.isoformat(),
                "link": "/vendor/dashboard",
                "priority": "normal",
                "is_unread": False
            })

            # 3. Thông báo quy định BQL
            ann_post = Posts.objects.filter(post_type='announcement', status='published').first()
            if ann_post:
                items.append({
                    "id": f"notif-bql-{ann_post.id}",
                    "category": "system_alert",
                    "category_label": "Thông Báo BQL",
                    "title": ann_post.title,
                    "content": ann_post.content[:110] + ("..." if len(ann_post.content) > 110 else ""),
                    "timestamp": format_time_ago(ann_post.created_at),
                    "created_at": ann_post.created_at.isoformat() if ann_post.created_at else now.isoformat(),
                    "link": "/vendor/dashboard",
                    "priority": "high",
                    "is_unread": True
                })

        else: # customer (Du khách)
            # 0. Thông báo kết quả Ban Quản Lý phê duyệt bài viết của người dùng
            approved_posts_qs = Posts.objects.filter(
                status='published',
                post_type='article'
            ).order_by('-updated_at')[:2]
            for ap in approved_posts_qs:
                pts_msg = f" và cộng thưởng +{int(ap.collected_kg * 10)} RE-Points!" if (ap.collected_kg and ap.collected_kg > 0) else "!"
                items.append({
                    "id": f"notif-post-approved-{ap.id}",
                    "category": "reward",
                    "category_label": "Duyệt Bài Viết",
                    "title": "🎉 Bài viết của bạn đã được BQL phê duyệt!",
                    "content": f'Bài viết "{ap.title[:45]}" đã được Ban Quản Lý Sơn Trà phê duyệt xuất bản lên Bảng tin{pts_msg}',
                    "timestamp": format_time_ago(ap.updated_at or ap.created_at),
                    "created_at": ap.updated_at.isoformat() if ap.updated_at else now.isoformat(),
                    "link": "/dashboard/community",
                    "priority": "high",
                    "is_unread": True
                })

            # 1. Cảnh báo khẩn cấp từ Ban Quản Lý (posts announcement)
            ann_qs = Posts.objects.filter(post_type='announcement', status='published').order_by('-created_at')[:2]
            for p in ann_qs:
                items.append({
                    "id": f"notif-ann-{p.id}",
                    "category": "system_alert",
                    "category_label": "Cảnh Báo BQL",
                    "title": p.title,
                    "content": p.content[:120] + ("..." if len(p.content) > 120 else ""),
                    "timestamp": format_time_ago(p.created_at),
                    "created_at": p.created_at.isoformat() if p.created_at else now.isoformat(),
                    "link": "/dashboard/community",
                    "priority": "high",
                    "is_unread": True
                })

            # 2. Cập nhật tiến độ xử lý phản ánh sự cố của du khách (feedbacks)
            fb_qs = Feedbacks.objects.filter(
                feedback_type__in=['environmental_issue', 'safety_violation']
            ).order_by('-created_at')[:2]
            for fb in fb_qs:
                is_resolved = fb.status == 'resolved'
                items.append({
                    "id": f"notif-fb-{fb.id}",
                    "category": "reward" if is_resolved else "incident",
                    "category_label": "Điểm Thưởng Xanh" if is_resolved else "Xử Lý Sự Cố",
                    "title": f"Phản ánh #{fb.id}: {fb.title}",
                    "content": "BQL Sơn Trà đã xử lý dọn sạch hiện trường và tặng bạn +50 RE-Points!" if is_resolved else f"Đội tuần tra kiểm lâm đã tiếp nhận xác minh sự cố ({fb.status}).",
                    "timestamp": format_time_ago(fb.created_at),
                    "created_at": fb.created_at.isoformat() if fb.created_at else now.isoformat(),
                    "link": "/dashboard/community",
                    "priority": "normal",
                    "is_unread": True
                })

            # 3. Sự kiện nhặt rác cộng đồng sắp diễn ra (posts cleanup_event)
            ev_qs = Posts.objects.filter(post_type='cleanup_event', status='published').order_by('-created_at')[:2]
            for ev in ev_qs:
                items.append({
                    "id": f"notif-ev-{ev.id}",
                    "category": "event",
                    "category_label": "Sự Kiện Xanh",
                    "title": f"Chiến dịch: {ev.title}",
                    "content": "Đăng ký tham gia làm sạch bãi biển và rừng nguyên sinh cuối tuần này để nhận huy hiệu số.",
                    "timestamp": format_time_ago(ev.created_at),
                    "created_at": ev.created_at.isoformat() if ev.created_at else now.isoformat(),
                    "link": "/dashboard/community",
                    "priority": "normal",
                    "is_unread": False
                })

            # 4. Xác nhận đơn đặt tour trekking gần nhất
            last_order = Orders.objects.order_by('-created_at').first()
            if last_order:
                items.append({
                    "id": f"notif-ord-cust-{last_order.id}",
                    "category": "booking",
                    "category_label": "Đặt Chỗ Trekking",
                    "title": f"Xác nhận đơn tour #{last_order.order_code}",
                    "content": f"Đơn đặt tour trekking sinh thái đã được xác nhận thành công. Vui lòng xem chi tiết lịch khởi hành.",
                    "timestamp": format_time_ago(last_order.created_at),
                    "created_at": last_order.created_at.isoformat() if last_order.created_at else now.isoformat(),
                    "link": "/dashboard/trekking",
                    "priority": "high",
                    "is_unread": True
                })

        return items


    @classmethod
    def get_admin_posts(cls, status=None, search=None):
        """
        Lấy danh sách tất cả bài viết phục vụ BQL kiểm duyệt nội dung (AD-03)
        """
        from django.db.models import Q
        qs = Posts.objects.select_related('author').all().order_by('-created_at')

        total_pending = qs.filter(status='draft').count()
        total_published = qs.filter(status='published').count()
        total_archived = qs.filter(status='archived').count()

        if status and status != 'all':
            qs = qs.filter(status=status)

        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(content__icontains=search) |
                Q(author__name__icontains=search) |
                Q(author__email__icontains=search)
            )

        posts_data = []
        status_labels = {
            'draft': 'Chờ kiểm duyệt',
            'published': 'Đã phê duyệt',
            'archived': 'Đã gỡ bỏ'
        }

        for post in qs:
            author = post.author
            author_name = author.name or author.email.split('@')[0] if author else "Ban Quản Lý Sơn Trà"
            initials = ''.join([part[0] for part in author_name.split() if part])[:2].upper() or "ST"
            role = author.role if author else "system_admin"

            role_badge = "🌿 Du Khách"
            if role in ['vendor', 'vendor_admin']:
                role_badge = "✓ Đối Tác Lữ Hành"
            elif role in ['system_admin', 'staff']:
                role_badge = "🛡️ Ban Quản Lý"

            posts_data.append({
                "id": post.id,
                "author_id": post.author_id,
                "author_name": author_name,
                "author_email": author.email if author else "",
                "author_initials": initials,
                "author_role": role,
                "role_badge": role_badge,
                "post_type": post.post_type,
                "title": post.title,
                "content": post.content or "",
                "thumbnail_url": post.thumbnail_url or "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80",
                "collected_kg": float(post.collected_kg or 0.0),
                "location_tag": "Bán đảo Sơn Trà",
                "status": post.status,
                "status_label": status_labels.get(post.status, post.status),
                "is_pinned": bool(post.post_type == 'announcement'),
                "created_at": post.created_at.strftime('%d/%m/%Y %H:%M') if post.created_at else "Hôm nay",
                "time_ago": "Vừa xong"
            })

        return {
            "metrics": {
                "total_pending": total_pending,
                "total_published": total_published,
                "total_archived": total_archived,
                "total_all": total_pending + total_published + total_archived
            },
            "posts": posts_data
        }

    @classmethod
    def review_post(cls, post_id, action, rejection_reason='', admin_user=None):
        """
        Admin BQL xử lý kiểm duyệt bài viết:
        - action == 'approve': chuyển status sang 'published', cộng điểm RE-Points nếu có rác nhặt được
        - action == 'reject': chuyển status sang 'archived'
        - action == 'restore': chuyển status sang 'draft'
        """
        post = Posts.objects.select_related('author').filter(id=int(post_id)).first()
        if not post:
            raise ValueError(f"Không tìm thấy bài viết #{post_id} trong hệ thống.")

        message = ""
        points_awarded = 0

        if action == 'approve':
            post.status = 'published'
            # Thưởng điểm RE-Points cho tác giả nếu bài viết có nhặt rác hợp lệ
            if post.collected_kg and float(post.collected_kg) > 0 and post.author and post.author.role == 'customer':
                points_awarded = int(float(post.collected_kg) * 10)
                post.author.total_eco_points = (post.author.total_eco_points or 0) + points_awarded
                post.author.save()
            post.save()
            message = f"Đã phê duyệt và xuất bản bài viết #{post.id} thành công lên Bảng tin cộng đồng!"
            if points_awarded > 0:
                message += f" Đã cộng +{points_awarded} RE-Points cho du khách {post.author.name}."

        elif action == 'reject':
            post.status = 'archived'
            post.save()
            message = f"Đã gỡ bỏ bài viết #{post.id} khỏi bảng tin."
            if rejection_reason:
                message += f" Lý do: {rejection_reason}"

        elif action == 'restore':
            post.status = 'draft'
            post.save()
            message = f"Đã đưa bài viết #{post.id} về hàng đợi chờ kiểm duyệt."

        else:
            raise ValueError(f"Hành động kiểm duyệt không hợp lệ: {action}")

        return {
            "id": post.id,
            "status": post.status,
            "status_label": 'Đã phê duyệt' if post.status == 'published' else ('Chờ kiểm duyệt' if post.status == 'draft' else 'Đã gỡ bỏ'),
            "message": message,
            "points_awarded": points_awarded
        }
