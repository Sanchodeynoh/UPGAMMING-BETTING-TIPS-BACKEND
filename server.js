// server.js
const express = require("express");
const cors = require("cors");
const { readDB, writeDB } = require("./db");
const { requireAdmin, ADMIN_PASSWORD } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "*" }));
app.use(express.json());

function expandGroups(groups, matches) {
  return groups.map((group) => ({
    league: group.league,
    flag: group.flag,
    matches: group.matchIds.map((id) => matches[id]).filter(Boolean)
  }));
}

// ---------- Health check ----------
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "upgamming-backend" });
});

// ---------- PUBLIC: schedule ----------
app.get("/api/matches/:date", (req, res) => {
  const db = readDB();
  const groups = db.scheduleByDate[req.params.date];
  if (!groups) {
    return res.status(404).json({ error: "No matches found for this date", date: req.params.date });
  }
  res.json({ date: req.params.date, groups: expandGroups(groups, db.matches) });
});

app.get("/api/dates", (req, res) => {
  const db = readDB();
  res.json({ dates: Object.keys(db.scheduleByDate) });
});

// ---------- PUBLIC: bet of the day ----------
app.get("/api/bet-of-the-day", (req, res) => {
  const db = readDB();
  res.json({
    valueBets: expandGroups(db.betOfTheDay.valueBets, db.matches),
    bankers: expandGroups(db.betOfTheDay.bankers, db.matches)
  });
});

// ---------- PUBLIC: single match ----------
app.get("/api/match/:id", (req, res) => {
  const db = readDB();
  const match = db.matches[req.params.id];
  if (!match) return res.status(404).json({ error: "Match not found", id: req.params.id });
  res.json(match);
});

// ---------- PUBLIC: livescores ----------
app.get("/api/livescores", (req, res) => {
  const db = readDB();
  res.json({ matches: db.liveMatches });
});

// ---------- PUBLIC: blogs ----------
app.get("/api/blogs", (req, res) => {
  const db = readDB();
  const list = db.blogs
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(({ content, ...preview }) => preview); // omit full content in list view
  res.json({ blogs: list });
});

app.get("/api/blogs/:id", (req, res) => {
  const db = readDB();
  const blog = db.blogs.find((b) => b.id === req.params.id);
  if (!blog) return res.status(404).json({ error: "Blog post not found" });
  res.json(blog);
});

// ---------- ADMIN: login ----------
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true, token: ADMIN_PASSWORD });
  }
  res.status(401).json({ success: false, error: "Incorrect password" });
});

// ---------- ADMIN: matches CRUD ----------
app.get("/api/admin/matches", requireAdmin, (req, res) => {
  const db = readDB();
  res.json({ matches: db.matches, scheduleByDate: db.scheduleByDate });
});

app.post("/api/admin/matches", requireAdmin, (req, res) => {
  const db = readDB();
  const m = req.body;

  if (!m.id || !m.date || !m.home || !m.away || !m.league) {
    return res.status(400).json({ error: "id, date, league, home, and away are required" });
  }
  if (db.matches[m.id]) {
    return res.status(409).json({ error: `Match id "${m.id}" already exists` });
  }

  db.matches[m.id] = m;

  if (!db.scheduleByDate[m.date]) db.scheduleByDate[m.date] = [];
  let group = db.scheduleByDate[m.date].find((g) => g.league === m.league);
  if (!group) {
    group = { league: m.league, flag: m.flag || "⚽", matchIds: [] };
    db.scheduleByDate[m.date].push(group);
  }
  group.matchIds.push(m.id);

  writeDB(db);
  res.status(201).json({ success: true, match: m });
});

app.put("/api/admin/matches/:id", requireAdmin, (req, res) => {
  const db = readDB();
  if (!db.matches[req.params.id]) {
    return res.status(404).json({ error: "Match not found" });
  }
  db.matches[req.params.id] = { ...db.matches[req.params.id], ...req.body, id: req.params.id };
  writeDB(db);
  res.json({ success: true, match: db.matches[req.params.id] });
});

app.delete("/api/admin/matches/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const id = req.params.id;
  if (!db.matches[id]) return res.status(404).json({ error: "Match not found" });

  delete db.matches[id];
  Object.values(db.scheduleByDate).forEach((groups) => {
    groups.forEach((g) => {
      g.matchIds = g.matchIds.filter((mid) => mid !== id);
    });
  });
  Object.values(db.betOfTheDay).forEach((groups) => {
    groups.forEach((g) => {
      g.matchIds = g.matchIds.filter((mid) => mid !== id);
    });
  });

  writeDB(db);
  res.json({ success: true });
});

// ---------- ADMIN: livescores CRUD ----------
app.post("/api/admin/livescores", requireAdmin, (req, res) => {
  const db = readDB();
  const lv = req.body;
  if (!lv.id || !lv.home || !lv.away) {
    return res.status(400).json({ error: "id, home, and away are required" });
  }
  if (db.liveMatches.find((m) => m.id === lv.id)) {
    return res.status(409).json({ error: `Live match id "${lv.id}" already exists` });
  }
  db.liveMatches.push(lv);
  writeDB(db);
  res.status(201).json({ success: true, match: lv });
});

app.put("/api/admin/livescores/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const idx = db.liveMatches.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Live match not found" });
  db.liveMatches[idx] = { ...db.liveMatches[idx], ...req.body, id: req.params.id };
  writeDB(db);
  res.json({ success: true, match: db.liveMatches[idx] });
});

app.delete("/api/admin/livescores/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const before = db.liveMatches.length;
  db.liveMatches = db.liveMatches.filter((m) => m.id !== req.params.id);
  if (db.liveMatches.length === before) return res.status(404).json({ error: "Live match not found" });
  writeDB(db);
  res.json({ success: true });
});

// ---------- ADMIN: blogs CRUD ----------
app.post("/api/admin/blogs", requireAdmin, (req, res) => {
  const db = readDB();
  const post = req.body;
  if (!post.id || !post.title || !post.content) {
    return res.status(400).json({ error: "id, title, and content are required" });
  }
  if (db.blogs.find((b) => b.id === post.id)) {
    return res.status(409).json({ error: `Blog id "${post.id}" already exists` });
  }
  post.date = post.date || new Date().toISOString().slice(0, 10);
  post.author = post.author || "UPGAMMING Team";
  db.blogs.push(post);
  writeDB(db);
  res.status(201).json({ success: true, blog: post });
});

app.put("/api/admin/blogs/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const idx = db.blogs.findIndex((b) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Blog post not found" });
  db.blogs[idx] = { ...db.blogs[idx], ...req.body, id: req.params.id };
  writeDB(db);
  res.json({ success: true, blog: db.blogs[idx] });
});

app.delete("/api/admin/blogs/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const before = db.blogs.length;
  db.blogs = db.blogs.filter((b) => b.id !== req.params.id);
  if (db.blogs.length === before) return res.status(404).json({ error: "Blog post not found" });
  writeDB(db);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`UPGAMMING backend running on port ${PORT}`);
});
