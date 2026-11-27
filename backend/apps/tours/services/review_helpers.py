import re
from collections import Counter
from decimal import Decimal

BANNED_WORDS = (
    'lừa đảo',
    'đồ chó',
    'khốn nạn',
    'chết tiệt',
    'mất dạy',
    'đụ',
    'địt',
    'lồn',
    'cặc',
    'vcl',
    'đm',
    'vl',
)
PHONE_RE = re.compile(r'(?<!\d)(?:\+84|84|0)\d{8,10}(?!\d)')
URL_RE = re.compile(r'(?:https?://|www\.)\S+|\b[a-z0-9-]+\.(?:com|vn|net|org|io)\b', re.IGNORECASE)


def parse_review_payload(raw_images):
    """
    Tách danh sách URL ảnh, phản hồi của Vendor, và metadata mở rộng
    (guide_rating, tour_tags, guide_tags, low_rating_reasons, edited_at, reports)
    từ cột JSONB `reviews.images`.
    """
    photos = []
    vendor_reply = ''
    replied_at = ''
    meta = {
        'guide_rating': None,
        'tour_tags': [],
        'guide_tags': [],
        'low_rating_reasons': [],
        'edited_at': None,
        'reports': [],
        'moderation_note': '',
        'moderated_at': None,
    }
    if isinstance(raw_images, list):
        for entry in raw_images:
            if isinstance(entry, str) and entry.strip():
                photos.append(entry.strip())
            elif isinstance(entry, dict):
                entry_type = entry.get('type')
                if entry_type == 'vendor_reply':
                    vendor_reply = str(entry.get('text') or '').strip()
                    replied_at = str(entry.get('replied_at') or '').strip()
                elif entry_type == 'review_meta':
                    if entry.get('guide_rating') is not None:
                        try:
                            gr = int(entry.get('guide_rating'))
                            if 1 <= gr <= 5:
                                meta['guide_rating'] = gr
                        except (TypeError, ValueError):
                            pass
                    if isinstance(entry.get('tour_tags'), list):
                        meta['tour_tags'] = [str(t).strip() for t in entry['tour_tags'] if str(t).strip()]
                    if isinstance(entry.get('guide_tags'), list):
                        meta['guide_tags'] = [str(t).strip() for t in entry['guide_tags'] if str(t).strip()]
                    if isinstance(entry.get('low_rating_reasons'), list):
                        meta['low_rating_reasons'] = [
                            str(t).strip() for t in entry['low_rating_reasons'] if str(t).strip()
                        ]
                    if entry.get('edited_at'):
                        meta['edited_at'] = str(entry.get('edited_at')).strip()
                    if isinstance(entry.get('reports'), list):
                        meta['reports'] = [r for r in entry['reports'] if isinstance(r, dict)]
                    if entry.get('moderation_note'):
                        meta['moderation_note'] = str(entry.get('moderation_note')).strip()
                    if entry.get('moderated_at'):
                        meta['moderated_at'] = str(entry.get('moderated_at')).strip()
    return photos, vendor_reply, replied_at, meta


def build_review_images_payload(photos, meta=None, vendor_reply=None, replied_at=None):
    """Đóng gói lại danh sách ảnh + metadata + phản hồi vendor vào JSONB."""
    payload = [str(url).strip() for url in (photos or []) if isinstance(url, str) and str(url).strip()]
    if meta:
        clean_meta = {
            'type': 'review_meta',
            'guide_rating': meta.get('guide_rating'),
            'tour_tags': list(meta.get('tour_tags') or []),
            'guide_tags': list(meta.get('guide_tags') or []),
            'low_rating_reasons': list(meta.get('low_rating_reasons') or []),
            'edited_at': meta.get('edited_at'),
            'reports': list(meta.get('reports') or []),
            'moderation_note': str(meta.get('moderation_note') or '').strip(),
            'moderated_at': meta.get('moderated_at'),
        }
        payload.append(clean_meta)
    if vendor_reply:
        payload.append({
            'type': 'vendor_reply',
            'text': str(vendor_reply).strip(),
            'replied_at': str(replied_at or '').strip(),
        })
    return payload


def mask_customer_name(full_name):
    """Che tên khách hàng: giữ họ và viết tắt chữ cái đầu tên đệm + tên (VD: Nguyễn V. A.)."""
    raw = str(full_name or '').strip()
    if not raw:
        return 'Du khách Sơn Trà'
    parts = [p for p in raw.split() if p]
    if len(parts) <= 1:
        return parts[0]
    first = parts[0]
    initials = ' '.join(f"{p[0].upper()}." for p in parts[1:] if p)
    return f"{first} {initials}".strip()


def needs_manual_review(comment):
    """Kiểm duyệt tự động: phát hiện từ ngữ thô tục, số điện thoại hoặc đường link."""
    text = str(comment or '').strip()
    if not text:
        return False
    lowered = text.lower()
    if PHONE_RE.search(text) or URL_RE.search(text):
        return True
    for bad in BANNED_WORDS:
        if re.search(rf'\b{re.escape(bad)}\b', lowered):
            return True
    return False


def compute_bayesian_score(rating_sum, count, global_mean=4.5, prior_weight=5):
    """Điểm xếp hạng Bayes: (C * m + sum) / (C + n)."""
    n = max(0, int(count or 0))
    if n == 0:
        return 0.0
    total = float(rating_sum or 0)
    return round((prior_weight * float(global_mean) + total) / (prior_weight + n), 4)


def compute_top_tags(tag_lists, limit=3):
    counter = Counter()
    for tags in tag_lists:
        for tag in tags or []:
            clean = str(tag).strip()
            if clean:
                counter[clean] += 1
    return [{'tag': name, 'count': cnt} for name, cnt in counter.most_common(limit)]


def guide_review_summary(guide_id):
    """Tổng hợp điểm đánh giá riêng của Hướng dẫn viên từ bảng reviews."""
    from apps.gamification.models.gamification_models import Reviews

    if not guide_id:
        return {
            'avg_rating': 0.0,
            'total_reviews': 0,
            'rating_breakdown': {'5': 0, '4': 0, '3': 0, '2': 0, '1': 0},
            'top_tags': [],
            'quality_level': 'new',
            'items': [],
        }

    qs = (
        Reviews.objects.filter(guide_id=int(guide_id), status='approved')
        .select_related('customer', 'tour')
        .order_by('-created_at', '-id')
    )
    breakdown = {'5': 0, '4': 0, '3': 0, '2': 0, '1': 0}
    rating_sum = 0
    count = 0
    guide_tag_lists = []
    items = []

    for rev in qs:
        photos, vendor_reply, replied_at, meta = parse_review_payload(rev.images)
        g_rating = meta.get('guide_rating')
        if g_rating is None:
            # Fallback cho review cũ trước khi tách điểm
            g_rating = int(rev.rating or 5)
        g_rating = max(1, min(5, int(g_rating)))
        breakdown[str(g_rating)] += 1
        rating_sum += g_rating
        count += 1
        g_tags = meta.get('guide_tags') or []
        if g_tags:
            guide_tag_lists.append(g_tags)

        items.append({
            'id': rev.id,
            'tour_id': rev.tour_id,
            'tour_title': rev.tour.title if rev.tour else 'Trải nghiệm Sơn Trà',
            'customer_name': mask_customer_name(rev.customer.name if rev.customer else ''),
            'guide_rating': g_rating,
            'tour_rating': int(rev.rating or 5),
            'comment': rev.comment or '',
            'guide_tags': g_tags,
            'images': photos,
            'vendor_reply': vendor_reply,
            'replied_at': replied_at,
            'edited_at': meta.get('edited_at'),
            'created_at': rev.created_at.strftime('%d/%m/%Y') if rev.created_at else '',
        })

    avg = round(rating_sum / count, 2) if count > 0 else 0.0
    if count >= 3 and avg < 3.0:
        quality_level = 'critical'
    elif count >= 3 and avg < 3.5:
        quality_level = 'warning'
    elif count == 0:
        quality_level = 'new'
    else:
        quality_level = 'healthy'

    return {
        'avg_rating': avg,
        'total_reviews': count,
        'rating_breakdown': breakdown,
        'top_tags': compute_top_tags(guide_tag_lists, limit=3),
        'quality_level': quality_level,
        'items': items,
    }
