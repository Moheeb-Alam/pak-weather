// Local server: npm start  ->  http://localhost:3000
const express = require("express");
const path = require("path");

const app = express();
app.get("/api/search", require("./api/search"));
app.get("/api/weather", require("./api/weather"));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Weather app running on http://localhost:${PORT}`));
