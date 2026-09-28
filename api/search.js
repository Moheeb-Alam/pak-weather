const { searchCities } = require("../lib/openmeteo");

module.exports = async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) return res.status(200).json([]);
  try {
    res.status(200).json(await searchCities(q));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};
