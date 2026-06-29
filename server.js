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

// Adds or removes a matchId from a category ("valueBets" or "bankers")
function setCategoryMembership(db, category, match, shouldBeIn) {
  if (!db.betOfTheDay[category]) db.betOfTheDay[category] = [];
  const groups = db.betOfTheDay[category];

  // Remove first (covers both "turn off" and "league changed" cases)
  groups.forEach((g) => {
    g.matchIds = g.matchIds.filter((id) => id !== match.id);
  });
  db.betOfTheDay[category] = groups.filter((g) => g.matchIds.length > 0);

  if (shouldBeIn) {
    let group = db.betOfTheDay[category].find((g) => g.league === match.league);
    if (!group) {
      group = { league: match.league, flag: match.flag || "⚽", matchIds: [] };
      db.betOfTheDay[category].push(group);
    }
    if (!group.matchIds.includes(match.id)) group.matchIds.push(match.id);
  }
}

// ---------- Health check ----------
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "upgamming-backend" });
});

// ---------- PUBLIC: schedule ----------
app.get("/api/matches/:date", async (req, res) => {
  const db = await readDB();
  const groups = db.scheduleByDate[req.params.date];
  if (!groups) {
    return res.status(404).json({ error: "No matches found for this date", date: req.params.date });
  }
  res.json({ date: req.params.date, groups: expandGroups(groups, db.matches) });
});

app.get("/api/dates", async (req, res) => {
  const db = await readDB();
  res.json({ dates: Object.keys(db.scheduleByDate) });
});

// ---------- PUBLIC: bet of the day ----------
app.get("/api/bet-of-the-day", async (req, res) => {
  const db = await readDB();
  res.json({
    valueBets: expandGroups(db.betOfTheDay.valueBets, db.matches),
    bankers: expandGroups(db.betOfTheDay.bankers, db.matches)
  });
});

// ---------- PUBLIC: single match ----------
app.get("/api/match/:id", async (req, res) => {
  const db = await readDB();
  const match = db.matches[req.params.id];
  if (!match) return res.status(404).json({ error: "Match not found", id: req.params.id });
  res.json(match);
});

// ---------- PUBLIC: livescores ----------
app.get("/api/livescores", async (req, res) => {
  const db = await readDB();
  res.json({ matches: db.liveMatches });
});

// ---------- PUBLIC: blogs ----------
app.get("/api/blogs", async (req, res) => {
  const db = await readDB();
  const list = db.blogs
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(({ content, ...preview }) => preview);
  res.json({ blogs: list });
});

app.get("/api/blogs/:id", async (req, res) => {
  const db = await readDB();
  const blog = db.blogs.find((b) => b.id === req.params.id);
  if (!blog) return res.status(404).json({ error: "Blog post not found" });
  res.json(blog);
});

// ---------- PUBLIC: premium tip package payment inquiry ----------
app.post("/api/payment-inquiries", async (req, res) => {
  const db = await readDB();
  const { package: pkg, name, phone, message } = req.body || {};

  if (!pkg || !message) {
    return res.status(400).json({ error: "package and message are required" });
  }

  const inquiry = {
    id: `pi_${Date.now()}`,
    package: pkg,
    name: name || "",
    phone: phone || "",
    message,
    status: "pending",
    submittedAt: new Date().toISOString()
  };

  db.paymentInquiries.unshift(inquiry);
  await writeDB(db);
  res.status(201).json({ success: true, inquiry });
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
app.get("/api/admin/matches", requireAdmin, async (req, res) => {
  const db = await readDB();
  res.json({
    matches: db.matches,
    scheduleByDate: db.scheduleByDate,
    betOfTheDay: db.betOfTheDay
  });
});

app.post("/api/admin/matches", requireAdmin, async (req, res) => {
  const db = await readDB();
  const { addToValueBets, addToBankers, ...m } = req.body;

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

  if (addToValueBets) setCategoryMembership(db, "valueBets", m, true);
  if (addToBankers) setCategoryMembership(db, "bankers", m, true);

  await writeDB(db);
  res.status(201).json({ success: true, match: m });
});

app.put("/api/admin/matches/:id", requireAdmin, async (req, res) => {
  const db = await readDB();
  const id = req.params.id;
  if (!db.matches[id]) {
    return res.status(404).json({ error: "Match not found" });
  }

  const { addToValueBets, addToBankers, ...updates } = req.body;
  const oldMatch = db.matches[id];
  const updatedMatch = { ...oldMatch, ...updates, id };

  // If the date or league changed, move it to the correct schedule group
  if (updates.date || updates.league) {
    Object.values(db.scheduleByDate).forEach((groups) => {
      groups.forEach((g) => {
        g.matchIds = g.matchIds.filter((mid) => mid !== id);
      });
    });
    Object.keys(db.scheduleByDate).forEach((date) => {
      db.scheduleByDate[date] = db.scheduleByDate[date].filter((g) => g.matchIds.length > 0);
    });

    const date = updatedMatch.date;
    if (!db.scheduleByDate[date]) db.scheduleByDate[date] = [];
    let group = db.scheduleByDate[date].find((g) => g.league === updatedMatch.league);
    if (!group) {
      group = { league: updatedMatch.league, flag: updatedMatch.flag || "⚽", matchIds: [] };
      db.scheduleByDate[date].push(group);
    }
    group.matchIds.push(id);
  }

  db.matches[id] = updatedMatch;

  if (typeof addToValueBets === "boolean") setCategoryMembership(db, "valueBets", updatedMatch, addToValueBets);
  if (typeof addToBankers === "boolean") setCategoryMembership(db, "bankers", updatedMatch, addToBankers);

  await writeDB(db);
  res.json({ success: true, match: updatedMatch });
});

app.delete("/api/admin/matches/:id", requireAdmin, async (req, res) => {
  const db = await readDB();
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

  await writeDB(db);
  res.json({ success: true });
});

// ---------- ADMIN: livescores CRUD ----------
app.post("/api/admin/livescores", requireAdmin, async (req, res) => {
  const db = await readDB();
  const lv = req.body;
  if (!lv.id || !lv.home || !lv.away) {
    return res.status(400).json({ error: "id, home, and away are required" });
  }
  if (db.liveMatches.find((m) => m.id === lv.id)) {
    return res.status(409).json({ error: `Live match id "${lv.id}" already exists` });
  }
  db.liveMatches.push(lv);
  await writeDB(db);
  res.status(201).json({ success: true, match: lv });
});

app.put("/api/admin/livescores/:id", requireAdmin, async (req, res) => {
  const db = await readDB();
  const idx = db.liveMatches.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Live match not found" });
  db.liveMatches[idx] = { ...db.liveMatches[idx], ...req.body, id: req.params.id };
  await writeDB(db);
  res.json({ success: true, match: db.liveMatches[idx] });
});

app.delete("/api/admin/livescores/:id", requireAdmin, async (req, res) => {
  const db = await readDB();
  const before = db.liveMatches.length;
  db.liveMatches = db.liveMatches.filter((m) => m.id !== req.params.id);
  if (db.liveMatches.length === before) return res.status(404).json({ error: "Live match not found" });
  await writeDB(db);
  res.json({ success: true });
});

// ---------- ADMIN: blogs CRUD ----------
app.post("/api/admin/blogs", requireAdmin, async (req, res) => {
  const db = await readDB();
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
  await writeDB(db);
  res.status(201).json({ success: true, blog: post });
});

app.put("/api/admin/blogs/:id", requireAdmin, async (req, res) => {
  const db = await readDB();
  const idx = db.blogs.findIndex((b) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Blog post not found" });
  db.blogs[idx] = { ...db.blogs[idx], ...req.body, id: req.params.id };
  await writeDB(db);
  res.json({ success: true, blog: db.blogs[idx] });
});

app.delete("/api/admin/blogs/:id", requireAdmin, async (req, res) => {
  const db = await readDB();
  const before = db.blogs.length;
  db.blogs = db.blogs.filter((b) => b.id !== req.params.id);
  if (db.blogs.length === before) return res.status(404).json({ error: "Blog post not found" });
  await writeDB(db);
  res.json({ success: true });
});

// ---------- ADMIN: payment inquiries ----------
app.get("/api/admin/payment-inquiries", requireAdmin, async (req, res) => {
  const db = await readDB();
  res.json({ inquiries: db.paymentInquiries });
});

app.put("/api/admin/payment-inquiries/:id", requireAdmin, async (req, res) => {
  const db = await readDB();
  const idx = db.paymentInquiries.findIndex((i) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Inquiry not found" });
  db.paymentInquiries[idx] = { ...db.paymentInquiries[idx], ...req.body, id: req.params.id };
  await writeDB(db);
  res.json({ success: true, inquiry: db.paymentInquiries[idx] });
});

app.delete("/api/admin/payment-inquiries/:id", requireAdmin, async (req, res) => {
  const db = await readDB();
  const before = db.paymentInquiries.length;
  db.paymentInquiries = db.paymentInquiries.filter((i) => i.id !== req.params.id);
  if (db.paymentInquiries.length === before) return res.status(404).json({ error: "Inquiry not found" });
  await writeDB(db);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`UPGAMMING backend running on port ${PORT}`);
});
