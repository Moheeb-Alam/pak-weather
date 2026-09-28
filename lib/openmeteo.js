// Open-Meteo se data lene ka shared code (Express aur Vercel dono use karte hain)
const GEO = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST = "https://api.open-meteo.com/v1/forecast";

async function searchCities(query) {
  const url = `${GEO}?name=${encodeURIComponent(query)}&count=8&language=en&country_code=PK`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Geocoding service error");
  const data = await r.json();
  return (data.results || []).map((c) => ({
    name: c.name,
    admin: c.admin1 || "",
    lat: c.latitude,
    lon: c.longitude,
    timezone: c.timezone,
  }));
}

async function getWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,precipitation",
    hourly: "temperature_2m,weather_code,precipitation_probability",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "7",
  });
  const r = await fetch(`${FORECAST}?${params}`);
  if (!r.ok) throw new Error("Weather service error");
  return r.json();
}

module.exports = { searchCities, getWeather };
