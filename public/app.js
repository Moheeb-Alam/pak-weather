const $ = (id) => document.getElementById(id);
const STORE = "mausam.locations";
const ACTIVE = "mausam.active";

const DEFAULTS = [
  { name: "Lahore", admin: "Punjab", lat: 31.558, lon: 74.3507 },
  { name: "Bhakkar", admin: "Punjab", lat: 31.6334, lon: 71.0654 },
  { name: "Islamabad", admin: "Islamabad", lat: 33.7215, lon: 73.0433 },
];

// WMO weather code -> label, icon, sky
function describe(code, isDay = 1) {
  if (code === 0) return { t: "Clear sky", i: isDay ? "☀️" : "🌙", sky: isDay ? "clear-day" : "clear-night" };
  if (code === 1) return { t: "Mostly clear", i: isDay ? "🌤️" : "🌙", sky: isDay ? "clear-day" : "clear-night" };
  if (code === 2) return { t: "Partly cloudy", i: isDay ? "⛅" : "☁️", sky: "cloudy" };
  if (code === 3) return { t: "Overcast", i: "☁️", sky: "cloudy" };
  if (code === 45 || code === 48) return { t: "Fog", i: "🌫️", sky: "fog" };
  if (code >= 51 && code <= 57) return { t: "Drizzle", i: "🌦️", sky: "rain" };
  if (code >= 61 && code <= 67) return { t: "Rain", i: "🌧️", sky: "rain" };
  if (code >= 71 && code <= 77) return { t: "Snow", i: "🌨️", sky: "snow" };
  if (code >= 80 && code <= 82) return { t: "Rain showers", i: "🌦️", sky: "rain" };
  if (code === 85 || code === 86) return { t: "Snow showers", i: "🌨️", sky: "snow" };
  if (code >= 95) return { t: "Thunderstorm", i: "⛈️", sky: "storm" };
  return { t: "Unknown", i: "🌡️", sky: "cloudy" };
}

const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

let locations = load(STORE, DEFAULTS);
let active = load(ACTIVE, locations[0]);

const compass = (deg) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8];
const uvLabel = (v) => (v < 3 ? "Low" : v < 6 ? "Moderate" : v < 8 ? "High" : v < 11 ? "Very high" : "Extreme");
const clock = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

function renderChips() {
  $("chips").innerHTML = "";
  locations.forEach((loc, idx) => {
    const el = document.createElement("div");
    el.className = "chip flex items-center cursor-pointer";
    el.tabIndex = 0;
    el.setAttribute("aria-current", String(loc.name === active?.name && loc.lat === active?.lat));
    el.innerHTML = `<span>${loc.name}</span>`;
    el.onclick = () => select(loc);
    el.onkeydown = (e) => { if (e.key === "Enter") select(loc); };
    if (locations.length > 1) {
      const rm = document.createElement("button");
      rm.textContent = "✕";
      rm.setAttribute("aria-label", `Remove ${loc.name}`);
      rm.onclick = (e) => {
        e.stopPropagation();
        locations.splice(idx, 1);
        save(STORE, locations);
        if (active.name === loc.name) select(locations[0]); else renderChips();
      };
      el.appendChild(rm);
    }
    $("chips").appendChild(el);
  });
}

async function select(loc) {
  active = loc;
  save(ACTIVE, loc);
  renderChips();
  $("status").textContent = `Loading weather for ${loc.name}…`;
  try {
    const r = await fetch(`/api/weather?lat=${loc.lat}&lon=${loc.lon}`);
    if (!r.ok) throw new Error();
    render(loc, await r.json());
    $("status").textContent = "";
  } catch {
    $("status").textContent = "Couldn't load weather. Check your internet connection and try again.";
  }
}

function stat(label, value, sub = "") {
  return `<div class="glass rounded-2xl p-4"><p class="text-white/70 text-sm">${label}</p>
  <p class="text-xl font-semibold mt-1">${value}</p>${sub ? `<p class="text-white/70 text-xs mt-0.5">${sub}</p>` : ""}</div>`;
}

function render(loc, w) {
  const c = w.current, d = w.daily;
  const info = describe(c.weather_code, c.is_day);
  document.body.dataset.sky = info.sky;
  $("app").classList.remove("hidden");

  $("place").textContent = `${loc.name}${loc.admin ? ", " + loc.admin : ""}`;
  $("localtime").textContent = new Date(c.time).toLocaleString("en-US", { weekday: "long", hour: "numeric", minute: "2-digit" });
  $("temp").textContent = Math.round(c.temperature_2m);
  $("condition").textContent = `${info.i} ${info.t}`;
  $("feels").textContent = `Feels like ${Math.round(c.apparent_temperature)}°  ·  High ${Math.round(d.temperature_2m_max[0])}°  Low ${Math.round(d.temperature_2m_min[0])}°`;

  $("stats").innerHTML =
    stat("Humidity", `${c.relative_humidity_2m}%`) +
    stat("Wind", `${Math.round(c.wind_speed_10m)} km/h`, compass(c.wind_direction_10m)) +
    stat("Pressure", `${Math.round(c.pressure_msl)} hPa`) +
    stat("UV index", Math.round(d.uv_index_max[0]), uvLabel(d.uv_index_max[0])) +
    stat("Sunrise", clock(d.sunrise[0])) +
    stat("Sunset", clock(d.sunset[0]));

  const start = w.hourly.time.findIndex((t) => t >= c.time.slice(0, 13));
  const from = start < 0 ? 0 : start;
  $("hourly").innerHTML = w.hourly.time.slice(from, from + 24).map((t, i) => {
    const k = from + i;
    const hr = new Date(t).getHours();
    const h = describe(w.hourly.weather_code[k], hr >= 6 && hr < 18 ? 1 : 0);
    return `<div class="flex flex-col items-center min-w-[3.5rem] gap-1">
      <span class="text-sm text-white/75">${i === 0 ? "Now" : clock(t).replace(":00", "")}</span>
      <span class="text-2xl">${h.i}</span>
      <span class="font-semibold">${Math.round(w.hourly.temperature_2m[k])}°</span>
      <span class="text-xs text-sky-100">${w.hourly.precipitation_probability[k] ?? 0}%</span></div>`;
  }).join("");

  const min = Math.min(...d.temperature_2m_min), max = Math.max(...d.temperature_2m_max);
  $("daily").innerHTML = d.time.map((t, i) => {
    const day = i === 0 ? "Today" : new Date(t).toLocaleDateString("en-US", { weekday: "long" });
    const lo = Math.round(d.temperature_2m_min[i]), hi = Math.round(d.temperature_2m_max[i]);
    const left = ((d.temperature_2m_min[i] - min) / (max - min || 1)) * 100;
    const width = ((d.temperature_2m_max[i] - d.temperature_2m_min[i]) / (max - min || 1)) * 100;
    return `<li class="flex items-center gap-3 py-3">
      <span class="w-24 sm:w-28 font-medium">${day}</span>
      <span class="text-xl w-8">${describe(d.weather_code[i]).i}</span>
      <span class="w-10 text-xs text-sky-100">${d.precipitation_probability_max[i] ?? 0}%</span>
      <span class="w-8 text-right text-white/75">${lo}°</span>
      <span class="flex-1 h-1.5 rounded-full bg-white/20 relative">
        <span class="absolute h-full rounded-full bg-white" style="left:${left}%;width:${Math.max(width, 6)}%"></span></span>
      <span class="w-8 font-semibold">${hi}°</span></li>`;
  }).join("");
}

// City search with debounce
let timer;
$("search").addEventListener("input", (e) => {
  clearTimeout(timer);
  const q = e.target.value.trim();
  if (q.length < 2) return hideResults();
  timer = setTimeout(async () => {
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      showResults(await r.json());
    } catch { hideResults(); }
  }, 300);
});

function showResults(list) {
  const ul = $("results");
  if (!Array.isArray(list) || !list.length) {
    ul.innerHTML = `<li class="px-4 py-3 text-white/70">No city found in Pakistan. Check the spelling.</li>`;
  } else {
    ul.innerHTML = "";
    list.forEach((c) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.tabIndex = 0;
      li.className = "px-4 py-3 cursor-pointer hover:bg-white/10";
      li.innerHTML = `<span class="font-semibold">${c.name}</span> <span class="text-white/60">${c.admin}</span>`;
      li.onclick = () => addLocation(c);
      li.onkeydown = (e) => { if (e.key === "Enter") addLocation(c); };
      ul.appendChild(li);
    });
  }
  ul.classList.remove("hidden");
}
function hideResults() { $("results").classList.add("hidden"); }

function addLocation(c) {
  const exists = locations.find((l) => Math.abs(l.lat - c.lat) < 0.01 && Math.abs(l.lon - c.lon) < 0.01);
  if (!exists) { locations.push(c); save(STORE, locations); }
  $("search").value = "";
  hideResults();
  select(exists || c);
}
document.addEventListener("click", (e) => { if (!e.target.closest("#search, #results")) hideResults(); });

renderChips();
select(active || locations[0]);
