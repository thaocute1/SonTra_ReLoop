import os
from math import radians, cos, sin, asin, sqrt
from datetime import datetime
from django.conf import settings

def calculate_haversine_distance(lat1, lon1, lat2, lon2):
    """
    Tính khoảng cách giữa 2 tọa độ GPS (km) theo công thức Haversine.
    """
    try:
        lat1, lon1, lat2, lon2 = map(float, [lat1, lon1, lat2, lon2])
        r = 6371.0  # Bán kính trái đất tính bằng km
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat / 2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2)**2
        c = 2 * asin(sqrt(a))
        return r * c
    except (ValueError, TypeError):
        return 0.0

def calculate_total_route_distance(points):
    """
    Tính tổng cự ly (km) cho một mảng các điểm: [{'lat': ..., 'lng': ...}, ...]
    """
    if not points or len(points) < 2:
        return 0.0
    
    total = 0.0
    for i in range(1, len(points)):
        p1 = points[i - 1]
        p2 = points[i]
        total += calculate_haversine_distance(
            p1.get('lat', 0), p1.get('lng', 0),
            p2.get('lat', 0), p2.get('lng', 0)
        )
    return round(total, 2)

def generate_gpx_content(tour_title, checkpoints, elevation_gain=0):
    """
    Tạo chuỗi XML định dạng GPX 1.1 chuẩn quốc tế từ danh sách Checkpoints
    """
    now_iso = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    
    # Header GPX 1.1
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<gpx version="1.1" creator="Son Tra Trail Quest - ReLoop"',
        '     xmlns="http://www.topografix.com/GPX/1/1"',
        '     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
        '     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">',
        '  <metadata>',
        f'    <name>{tour_title}</name>',
        f'    <desc>Lộ trình trekking Sơn Trà được tạo bởi Vendor qua Son Tra Trail Quest</desc>',
        f'    <time>{now_iso}</time>',
        '  </metadata>'
    ]

    # Danh sách Waypoints (Checkpoints)
    for cp in checkpoints:
        lat = cp.get('lat')
        lng = cp.get('lng')
        name = cp.get('name', f"Trạm {cp.get('order_index', '')}")
        radius = cp.get('radius_tolerance_m', 30)
        lines.append(f'  <wpt lat="{lat}" lon="{lng}">')
        lines.append(f'    <name>{name}</name>')
        lines.append(f'    <desc>Bán kính quét: {radius}m</desc>')
        lines.append('    <type>checkpoint</type>')
        lines.append('  </wpt>')

    # Tuyến Track & Track Segment
    lines.append('  <trk>')
    lines.append(f'    <name>{tour_title} - Tuyến đường</name>')
    lines.append('    <trkseg>')
    for cp in checkpoints:
        lat = cp.get('lat')
        lng = cp.get('lng')
        lines.append(f'      <trkpt lat="{lat}" lon="{lng}">')
        if elevation_gain:
            lines.append(f'        <ele>{elevation_gain}</ele>')
        lines.append('      </trkpt>')
    lines.append('    </trkseg>')
    lines.append('  </trk>')
    lines.append('</gpx>')

    return '\n'.join(lines)

def save_gpx_file_for_tour(tour_id, tour_title, checkpoints, elevation_gain=0):
    """
    Sinh và lưu file GPX vào thư mục media/routes/
    Trả về đường dẫn URL tương đối
    """
    media_root = getattr(settings, 'MEDIA_ROOT', os.path.join(settings.BASE_DIR, 'media'))
    routes_dir = os.path.join(media_root, 'routes')
    os.makedirs(routes_dir, exist_ok=True)

    filename = f"tour_{tour_id}_route.gpx"
    filepath = os.path.join(routes_dir, filename)

    gpx_xml = generate_gpx_content(tour_title, checkpoints, elevation_gain)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(gpx_xml)

    # Đường dẫn url phục vụ tải file
    media_url = getattr(settings, 'MEDIA_URL', '/media/')
    return f"{media_url}routes/{filename}"

