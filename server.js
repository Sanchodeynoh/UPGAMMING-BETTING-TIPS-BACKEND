// server.js
const express = require("express");
const cors = require("cors");
const { matches, scheduleByDate, betOfTheDay } = require("./data");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "*" }));
app.use(express.json());

// Helper: expand a list of {league, flag, matchIds} groups into
// {league, flag, matches: [...]} using the full match objects.
function expandGroups(groups) {
  return groups.map((group) => ({
    league: group.league,
    flag: group.flag,
    matches: group.matchIds
      .map((id) => matches[id])
      .filter(Boolean)
  }));
}

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "upgamming-backend" });
});

// Home page schedule for a given date: /api/matches/2026-06-28
// Returns an array of league groups: [{ league, flag, matches: [...] }]
app.get("/api/matches/:date", (req, res) => {
  const { date } = req.params;
  const groups = scheduleByDate[date];

  if (!groups) {
    return res.status(404).json({ error: "No matches found for this date", date });
  }

  res.json({ date, groups: expandGroups(groups) });
});

// All dates that currently have schedule data
app.get("/api/dates", (req, res) => {
  res.json({ dates: Object.keys(scheduleByDate) });
});

// Bet of the Day page: returns both valueBets and bankers, each as
// an array of league groups
app.get("/api/bet-of-the-day", (req, res) => {
  res.json({
    valueBets: expandGroups(betOfTheDay.valueBets),
    bankers: expandGroups(betOfTheDay.bankers)
  });
});

// Single match detail: /api/match/m1
app.get("/api/match/:id", (req, res) => {
  const match = matches[req.params.id];

  if (!match) {
    return res.status(404).json({ error: "Match not found", id: req.params.id });
  }

  res.json(match);
});

app.listen(PORT, () => {
  console.log(`UPGAMMING backend running on port ${PORT}`);
});
