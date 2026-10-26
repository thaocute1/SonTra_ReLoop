import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
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
  let bgColor = '#2F5D4A';
  if (isStart) bgColor = '#146C43';
  if (isFinish) bgColor = '#8B5000';

  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        background-color: ${bgColor};
        color: white;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 11px;
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      ">
        ${number}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
};

// Component tự động fit bounds
function FitBounds({ coordinates }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [coordinates, map]);
  return null;
}
// Tự động invalidate size để đảm bảo bản đồ không bị trắng khi mount vào modal/fullscreen
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


// Cấu hình các lớp bản đồ Google Maps
const GOOGLE_MAP_LAYERS = {
  roadmap: {
    name: 'Google Maps',
    url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20
  },
  satellite: {
    name: 'Google vệ tinh',
    url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20
  },
  terrain: {
    name: 'Google địa hình',
    url: 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20
  }
};

export default function RouteMapPreview({
  coordinates = [],
  checkpoints = [],
  height = '320px',
  tourTitle = '',
  scrollWheelZoom = true,
  className = ''
}) {
  const [mapType, setMapType] = useState('roadmap');
  const defaultCenter = [16.1158, 108.2619];
  const [activePolyline, setActivePolyline] = useState(coordinates || []);

  useEffect(() => {
    if (coordinates && coordinates.length > 2) {
      setActivePolyline(coordinates);
      return;
    }

    const validCps = (checkpoints || []).filter(cp => (cp.lat || cp.latitude) && (cp.lng || cp.longitude));
    if (validCps.length >= 2) {
      const coordsQuery = validCps
        .map(cp => `${cp.lng || cp.longitude},${cp.lat || cp.latitude}`)
        .join(';');
      fetch(`https://router.project-osrm.org/route/v1/foot/${coordsQuery}?overview=full&geometries=geojson`)
        .then(res => res.json())
        .then(data => {
          if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const path = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
            setActivePolyline(path);
          } else {
            setActivePolyline(validCps.map(cp => [parseFloat(cp.lat || cp.latitude), parseFloat(cp.lng || cp.longitude)]));
          }
        })
        .catch(() => {
          setActivePolyline(validCps.map(cp => [parseFloat(cp.lat || cp.latitude), parseFloat(cp.lng || cp.longitude)]));
        });
    }
  }, [coordinates, checkpoints]);

  const mapCenter = activePolyline.length > 0 ? activePolyline[0] : defaultCenter;

  return (
    <div className={`relative overflow-hidden ${className || 'rounded-2xl border border-[#C5CCC7] shadow-inner'}`} style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={13}
        scrollWheelZoom={scrollWheelZoom}
        className="h-full w-full z-0"
      >
        <MapResizer />
        <TileLayer
          attribution='&copy; Google Maps'
          url={GOOGLE_MAP_LAYERS[mapType].url}
          subdomains={GOOGLE_MAP_LAYERS[mapType].subdomains}
          maxZoom={20}
        />

        {/* Nối các điểm bằng đường Polyline */}
        {activePolyline.length > 1 && (
          <>
            <Polyline
              positions={activePolyline}
              pathOptions={{
                color: '#2F5D4A',
                weight: 5,
                opacity: 0.85,
                lineJoin: 'round'
              }}
            />
            <FitBounds coordinates={activePolyline} />
          </>
        )}

        {/* Markers cho từng trạm Checkpoint */}
        {checkpoints.map((cp, idx) => {
          const lat = cp.lat || (cp.latitude ? parseFloat(cp.latitude) : null);
          const lng = cp.lng || (cp.longitude ? parseFloat(cp.longitude) : null);
          if (!lat || !lng) return null;

          const order = cp.order_index || idx + 1;
          const isStart = idx === 0;
          const isFinish = idx === checkpoints.length - 1 && checkpoints.length > 1;

          return (
            <Marker
              key={cp.id || `${order}-${lat}-${lng}`}
              position={[lat, lng]}
              icon={createNumberIcon(order, isStart, isFinish)}
            >
              <Popup>
                <div className="p-1 min-w-[140px]">
                  <span className="font-bold text-[#191C1A] text-xs block">
                    #{order} - {cp.name}
                  </span>
                  {cp.desc && <p className="text-[11px] text-gray-500 my-1">{cp.desc}</p>}
                  <p className="text-[10px] text-gray-400 m-0">
                    Bán kính quét: {cp.radius_tolerance_m || 30}m
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Nút chuyển đổi kiểu bản đồ Google */}
      <div className="absolute bottom-2.5 left-2.5 z-1000 bg-white/95 backdrop-blur-xs p-1 rounded-xl shadow-md border border-[#C5CCC7] flex items-center gap-1 text-[10px] font-semibold text-[#191C1A]">
        <button
          type="button"
          onClick={() => setMapType('roadmap')}
          className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
            mapType === 'roadmap' ? 'bg-[#2F5D4A] text-white shadow-xs' : 'text-[#4A514C] hover:bg-gray-100'
          }`}
        >
          Google Maps
        </button>
        <button
          type="button"
          onClick={() => setMapType('satellite')}
          className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
            mapType === 'satellite' ? 'bg-[#2F5D4A] text-white shadow-xs' : 'text-[#4A514C] hover:bg-gray-100'
          }`}
        >
          Vệ tinh
        </button>
      </div>

      {/* Badge thông số nhỏ góc trên */}
      {checkpoints.length > 0 && (
        <div className="absolute top-2.5 right-2.5 z-1000 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-[#C5CCC7] shadow-xs text-[11px] font-semibold text-[#191C1A] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#2F5D4A] animate-ping" />
          <span>{checkpoints.length} trạm GPS đã thiết lập</span>
        </div>
      )}
    </div>
  );
}

