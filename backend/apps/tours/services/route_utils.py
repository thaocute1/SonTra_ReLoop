from math import radians, cos, sin, asin, sqrt

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


