// server.js
const express = require("express");
const cors = require("cors");
const matchData = require("./data");

const app = express();
const PORT = process.env.PORT || 3000;

// Allow requests from your GitHub Pages frontend (and anywhere, by default).
// For tighter security, replace origin: "*" with your actual frontend URL,
// e.g. origin: "https://yourusername.github.io"
app.use(cors({ origin: "*" }));
app.use(express.json());

// Health check (useful for Render to verify the service is alive)
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "upgamming-backend" });
});

// Get matches for a specific date: /api/matches/2026-06-28
app.get("/api/matches/:date", (req, res) => {
  const { date } = req.params;
  const day = matchData[date];

  if (!day) {
    return res.status(404).json({
      error: "No matches found for this date",
      date
    });
  }

  res.json(day);
});

// Get every date that currently has data (handy for the frontend to know
// which dates are populated)
app.get("/api/dates", (req, res) => {
  res.json({ dates: Object.keys(matchData) });
});

app.listen(PORT, () => {
  console.log(`UPGAMMING backend running on port ${PORT}`);
});
