const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

export async function getSonTraWeather() {
  const query = new URLSearchParams({
    latitude: '16.1048',
    longitude: '108.2772',
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
    timezone: 'Asia/Ho_Chi_Minh',
  });
  const response = await fetch(`${WEATHER_URL}?${query}`);
  if (!response.ok) throw new Error('Không thể tải thời tiết');
  const data = await response.json();
  const current = data.current || {};
  return {
    temperature: Math.round(current.temperature_2m),
    humidity: Math.round(current.relative_humidity_2m),
    wind: Math.round(current.wind_speed_10m),
    description: describeWeather(Number(current.weather_code)),
  };
}

function describeWeather(code) {
  if (code === 0) return 'Trời quang, nắng nhẹ';
  if ([1, 2, 3].includes(code)) return 'Có mây, thời tiết dễ chịu';
  if ([45, 48].includes(code)) return 'Có sương mù';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Có mưa, đường mòn có thể trơn';
  if ([95, 96, 99].includes(code)) return 'Có giông, nên tạm hoãn trekking';
  return 'Đang cập nhật điều kiện thời tiết';
}

export default { getSonTraWeather };
