import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Trash2, RotateCcw, Plus, Info, Navigation, Route, Sparkles } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix icon marker mặc định của Leaflet trong Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Tạo custom marker icon đánh số thứ tự
const createNumberIcon = (number, isStart = false, isFinish = false) => {
  let bgColor = '#4A6B5D';
  if (isStart) bgColor = '#2E7D32'; // Xanh lá đậm cho Start
  if (isFinish) bgColor = '#D97706'; // Hổ phách cho Finish

  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        background-color: ${bgColor};
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 12px;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">
        ${number}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

// Tính khoảng cách Haversine đường thẳng giữa 2 tọa độ (km)
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Component con để lắng nghe sự kiện click trên bản đồ
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

// Component tự động căn chỉnh khung hình theo danh sách điểm

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 350);
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  return null;
}

function FitBoundsToPoints({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 1) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);
  return null;
}

// Cấu hình các lớp bản đồ Google Maps
const GOOGLE_MAP_LAYERS = {
  roadmap: {
    name: 'Google Bản đồ',
    url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20
  },
  satellite: {
    name: 'Google Vệ tinh',
    url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20
  },
  terrain: {
    name: 'Google Địa hình',
    url: 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20
  }
};

export default function RouteMapPicker({
  checkpoints = [],
  onChange,
  onDistanceChange,
  onDetailedRoute,
  height = '380px'
}) {
  // Kiểu bản đồ: 'roadmap' (Mặc định - Đầy đủ địa danh Google Maps), 'satellite', 'terrain'
  const [mapType, setMapType] = useState('roadmap');
  
  // Bám theo đường đi bộ / đường mòn tự nhiên (Auto Snap-to-Road Routing)
  const [snapToRoad, setSnapToRoad] = useState(true);
  const [detailedRoute, setDetailedRoute] = useState([]);
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);
  const [calculatedKm, setCalculatedKm] = useState(0);

  // Tâm Bán đảo Sơn Trà
  const defaultCenter = [16.1158, 108.2619];

  // Tính tổng cự ly đường thẳng dự phòng
  const calculateStraightKm = (pts) => {
    if (!pts || pts.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < pts.length; i++) {
      sum += haversineDistance(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
    }
    return parseFloat(sum.toFixed(2));
  };

  // Tự động tìm đường mòn/đường bộ thực tế khi danh sách Checkpoint thay đổi
  useEffect(() => {
    if (!checkpoints || checkpoints.length === 0) {
      setDetailedRoute([]);
      setCalculatedKm(0);
      if (onDistanceChange) onDistanceChange(0);
      if (onDetailedRoute) onDetailedRoute([]);
      return;
    }

    if (checkpoints.length === 1) {
      const singlePoint = [[checkpoints[0].lat, checkpoints[0].lng]];
      setDetailedRoute(singlePoint);
      setCalculatedKm(0);
      if (onDistanceChange) onDistanceChange(0);
      if (onDetailedRoute) onDetailedRoute(singlePoint);
      return;
    }

    // Nếu tắt bám theo đường (Chế độ việt dã / off-road đường thẳng)
    if (!snapToRoad) {
      const straightCoords = checkpoints.map(cp => [cp.lat, cp.lng]);
      const dist = calculateStraightKm(checkpoints);
      setDetailedRoute(straightCoords);
      setCalculatedKm(dist);
      if (onDistanceChange) onDistanceChange(dist);
      if (onDetailedRoute) onDetailedRoute(straightCoords);
      return;
    }

    // GỌI ROUTING API (OSRM Foot Routing) để bám theo khúc cua đường mòn thực tế
    const fetchRoadRoute = async () => {
      setIsRoutingLoading(true);
      try {
        const coordsQuery = checkpoints.map(cp => `${cp.lng},${cp.lat}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/foot/${coordsQuery}?overview=full&geometries=geojson`;
        
        const res = await fetch(url);
        const data = await res.json();

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          // OSRM trả về [lng, lat], chuyển sang [lat, lng] cho Leaflet
          const leafletCoords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          const realDistanceKm = parseFloat((route.distance / 1000).toFixed(2));

          setDetailedRoute(leafletCoords);
          setCalculatedKm(realDistanceKm);
          if (onDistanceChange) onDistanceChange(realDistanceKm);
          if (onDetailedRoute) onDetailedRoute(leafletCoords);
        } else {
          // Fallback đường thẳng nếu cung đường quá sâu trong rừng chưa có dữ liệu OSRM
          const fallback = checkpoints.map(cp => [cp.lat, cp.lng]);
          const dist = calculateStraightKm(checkpoints);
          setDetailedRoute(fallback);
          setCalculatedKm(dist);
          if (onDistanceChange) onDistanceChange(dist);
          if (onDetailedRoute) onDetailedRoute(fallback);
        }
      } catch (err) {
        console.warn('Không thể kết nối OSRM, fallback sang đường nối trực tiếp:', err);
        const fallback = checkpoints.map(cp => [cp.lat, cp.lng]);
        const dist = calculateStraightKm(checkpoints);
        setDetailedRoute(fallback);
        setCalculatedKm(dist);
        if (onDistanceChange) onDistanceChange(dist);
        if (onDetailedRoute) onDetailedRoute(fallback);
      } finally {
        setIsRoutingLoading(false);
      }
    };

    fetchRoadRoute();
  }, [checkpoints, snapToRoad]);

  // Xử lý khi Vendor nhấp chuột trên bản đồ
  const handleMapClick = (latlng) => {
    const lat = parseFloat(latlng.lat.toFixed(6));
    const lng = parseFloat(latlng.lng.toFixed(6));
    const nextOrder = checkpoints.length + 1;

    let defaultName = `Trạm ${nextOrder}`;
    if (nextOrder === 1) defaultName = 'Điểm Tập Kết Xuất Phát';

    const newCheckpoint = {
      order_index: nextOrder,
      name: defaultName,
      lat,
      lng,
      radius_tolerance_m: 30,
      desc: nextOrder === 1 ? 'Điểm danh đầu tuyến và kiểm tra an toàn.' : 'Trạm dừng chân và kiểm soát an toàn GPS.'
    };

    const updated = [...checkpoints, newCheckpoint];
    if (updated.length >= 2) {
      updated[updated.length - 1].name = `Đích Đến Trạm ${updated.length}`;
    }

    onChange(updated);
  };

  // Cập nhật tên hoặc bán kính trạm
  const handleUpdateCheckpoint = (index, field, value) => {
    const updated = [...checkpoints];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  // Xóa 1 điểm
  const handleRemovePoint = (index) => {
    const filtered = checkpoints.filter((_, i) => i !== index);
    const reindexed = filtered.map((cp, i) => ({
      ...cp,
      order_index: i + 1,
      name: i === 0 && cp.name.startsWith('Trạm') ? 'Điểm Tập Kết Xuất Phát' : cp.name
    }));
    onChange(reindexed);
  };

  // Xóa toàn bộ
  const handleClearAll = () => {
    onChange([]);
  };

  // Nạp tuyến mẫu Sơn Trà (Quick Preset)
  const handleLoadPreset = () => {
    const preset = [
      { order_index: 1, name: 'Chân dốc Hoàng Sa (Thọ Quang)', lat: 16.1018, lng: 108.2530, radius_tolerance_m: 30, desc: 'Điểm danh tập kết xuất phát' },
      { order_index: 2, name: 'Trạm Kiểm Lâm Suối Lớn', lat: 16.1105, lng: 108.2610, radius_tolerance_m: 30, desc: 'Trạm dừng chân kiểm tra nước' },
      { order_index: 3, name: 'Vọng Cảnh Vịnh Đà Nẵng', lat: 16.1180, lng: 108.2720, radius_tolerance_m: 30, desc: 'Điểm ngắm Voọc Chà Vá' },
      { order_index: 4, name: 'Đỉnh Bàn Cờ (Độ cao 700m)', lat: 16.1215, lng: 108.2810, radius_tolerance_m: 50, desc: 'Đích đến check-in hoàng hôn' }
    ];
    onChange(preset);
  };

  return (
    <div className="space-y-3">
      {/* Thanh công cụ & hướng dẫn */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#E9EFEC] border border-[#DCE5DF] text-xs">
        <div className="flex items-center gap-2 text-[#2D3732]">
          <Info className="w-4 h-4 text-[#4A6B5D] shrink-0" />
          <span>
            <strong>Hướng dẫn:</strong> Nhấp chuột lên bản đồ để đặt các trạm. Hệ thống sẽ <strong>tự động uốn lượn theo đường mòn</strong> nối giữa các điểm!
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Nút bật/tắt bám theo đường đi */}
          <button
            type="button"
            onClick={() => setSnapToRoad(!snapToRoad)}
            className={`px-2.5 py-1.5 rounded-xl border font-semibold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer ${
              snapToRoad
                ? 'bg-[#4A6B5D] text-white border-[#4A6B5D]'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
            title="Tự động bám dính theo các khúc cua của đường mòn thực tế"
          >
            <Route className="w-3.5 h-3.5" />
            <span>{snapToRoad ? 'Đang bám theo đường đi' : 'Đường thẳng xuyên rừng'}</span>
          </button>

          <button
            type="button"
            onClick={handleLoadPreset}
            className="px-2.5 py-1.5 rounded-xl bg-white text-[#4A6B5D] border border-[#DCE5DF] hover:bg-[#F7F5F0] font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
            title="Nạp nhanh 4 trạm mẫu trên tuyến Hoàng Sa - Đỉnh Bàn Cờ"
          >
            <Navigation className="w-3.5 h-3.5" />
            Tuyến mẫu
          </button>

          {checkpoints.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1.5 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Xóa làm lại
            </button>
          )}
        </div>
      </div>

      {/* Khung bản đồ */}
      <div className="relative rounded-2xl overflow-hidden border border-[#E2E8E4] shadow-inner" style={{ height }}>
        <MapContainer
          center={checkpoints.length > 0 ? [checkpoints[0].lat, checkpoints[0].lng] : defaultCenter}
          zoom={14}
          scrollWheelZoom={true}
          className="h-full w-full z-0 cursor-crosshair"
        >
          <MapResizer />
          <TileLayer
            attribution='&copy; Google Maps'
            url={GOOGLE_MAP_LAYERS[mapType].url}
            subdomains={GOOGLE_MAP_LAYERS[mapType].subdomains}
            maxZoom={20}
          />

          <MapClickHandler onMapClick={handleMapClick} />
          {checkpoints.length > 1 && <FitBoundsToPoints points={checkpoints} />}

          {/* Đường vẽ lộ trình uốn lượn theo đường mòn thực tế */}
          {detailedRoute.length > 1 && (
            <Polyline
              positions={detailedRoute}
              pathOptions={{
                color: '#2F5244',
                weight: 5,
                opacity: 0.9,
                lineJoin: 'round',
                lineCap: 'round'
              }}
            />
          )}

          {/* Markers các Checkpoints */}
          {checkpoints.map((cp, idx) => {
            const isStart = idx === 0;
            const isFinish = idx === checkpoints.length - 1 && checkpoints.length > 1;
            return (
              <Marker
                key={`${cp.order_index}-${cp.lat}-${cp.lng}`}
                position={[cp.lat, cp.lng]}
                icon={createNumberIcon(cp.order_index, isStart, isFinish)}
              >
                <Popup>
                  <div className="p-1 min-w-[160px]">
                    <div className="font-bold text-[#2D3732] text-xs">
                      #{cp.order_index} - {cp.name}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Tọa độ: {cp.lat.toFixed(4)}, {cp.lng.toFixed(4)}
                    </div>
                    <div className="text-[11px] text-[#4A6B5D] mt-0.5">
                      Bán kính quét GPS: {cp.radius_tolerance_m || 30}m
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Nút chuyển đổi kiểu bản đồ Google */}
        <div className="absolute bottom-3 left-3 z-1000 bg-white/95 backdrop-blur-xs p-1 rounded-xl shadow-md border border-[#E2E8E4] flex items-center gap-1 text-[11px] font-semibold text-[#2D3732]">
          <button
            type="button"
            onClick={() => setMapType('roadmap')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              mapType === 'roadmap' ? 'bg-[#4A6B5D] text-white shadow-xs' : 'text-[#6B7A72] hover:bg-gray-100'
            }`}
          >
            Google Bản đồ
          </button>
          <button
            type="button"
            onClick={() => setMapType('satellite')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              mapType === 'satellite' ? 'bg-[#4A6B5D] text-white shadow-xs' : 'text-[#6B7A72] hover:bg-gray-100'
            }`}
          >
            Google Vệ tinh
          </button>
          <button
            type="button"
            onClick={() => setMapType('terrain')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              mapType === 'terrain' ? 'bg-[#4A6B5D] text-white shadow-xs' : 'text-[#6B7A72] hover:bg-gray-100'
            }`}
          >
            Google Địa hình
          </button>
        </div>

        {/* Badge thống kê cự ly thực tế góc trên bản đồ */}
        <div className="absolute top-3 right-3 z-1000 bg-white/95 backdrop-blur-xs px-3.5 py-2 rounded-2xl shadow-md border border-[#E2E8E4] flex items-center gap-3 text-xs">
          <div>
            <span className="text-[#6B7A72] block text-[10px] font-semibold uppercase">Số trạm GPS</span>
            <span className="font-bold text-[#2D3732] text-sm">{checkpoints.length} điểm</span>
          </div>
          <div className="h-6 w-px bg-gray-200" />
          <div>
            <span className="text-[#6B7A72] block text-[10px] font-semibold uppercase flex items-center gap-1">
              <span>Cự ly thực tế</span>
              {isRoutingLoading && <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
            </span>
            <span className="font-bold text-[#4A6B5D] text-sm">
              {isRoutingLoading ? 'Đang tính...' : `${calculatedKm} km`}
            </span>
          </div>
        </div>
      </div>

      {/* Danh sách các Checkpoints */}
      {checkpoints.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-[#F7F5F0] border border-[#E2E8E4] space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#2D3732] text-xs">
              Danh sách {checkpoints.length} trạm kiểm soát GPS đã đặt:
            </span>
            <span className="text-[11px] text-[#6B7A72]">
              {snapToRoad ? '✨ Tuyến đường đang tự động bám theo lối đi bộ thực tế' : '⚠️ Chế độ đường thẳng xuyên rừng'}
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {checkpoints.map((cp, idx) => {
              const isStart = idx === 0;
              const isFinish = idx === checkpoints.length - 1 && checkpoints.length > 1;

              return (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-white border border-[#E2E8E4] flex flex-wrap sm:flex-nowrap items-center gap-2 text-xs"
                >
                  <span
                    className={`w-6 h-6 rounded-full text-white font-bold text-[11px] flex items-center justify-center shrink-0 ${
                      isStart ? 'bg-[#2E7D32]' : isFinish ? 'bg-[#D97706]' : 'bg-[#4A6B5D]'
                    }`}
                  >
                    {cp.order_index}
                  </span>

                  <div className="flex-1 min-w-[150px]">
                    <input
                      type="text"
                      value={cp.name}
                      onChange={(e) => handleUpdateCheckpoint(idx, 'name', e.target.value)}
                      placeholder="Tên trạm..."
                      className="w-full px-2.5 py-1 rounded-lg border border-[#E2E8E4] text-xs font-semibold text-[#2D3732] focus:outline-hidden focus:border-[#4A6B5D]"
                    />
                  </div>

                  <span className="text-[11px] text-[#6B7A72] font-mono shrink-0 hidden md:inline">
                    {cp.lat.toFixed(4)}, {cp.lng.toFixed(4)}
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[11px] text-[#6B7A72]">Quét:</span>
                    <select
                      value={cp.radius_tolerance_m || 30}
                      onChange={(e) => handleUpdateCheckpoint(idx, 'radius_tolerance_m', parseInt(e.target.value))}
                      className="px-2 py-1 rounded-lg border border-[#E2E8E4] text-[11px] bg-white font-medium focus:outline-hidden"
                    >
                      <option value={20}>20m</option>
                      <option value={30}>30m</option>
                      <option value={50}>50m</option>
                      <option value={100}>100m</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemovePoint(idx)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                    title="Xóa trạm này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
