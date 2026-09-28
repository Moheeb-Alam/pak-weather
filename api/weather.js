const { getWeather } = require("../lib/openmeteo");

module.exports = async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: "lat and lon are required" });
  }
  try {
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json(await getWeather(lat, lon));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};
