// bot/tasks.js
const { getFixturesByDate, getLiveFixtures, getTeamForm } = require("./lib/apiFootballDirect");
const { fixtureToMatch, fixtureToLiveMatch, buildForm } = require("./lib/mapDataAF");
const { getAllOddsMap } = require("./lib/oddsApi");
const { pickResult, pickGoals, generateAnalysis, scoreBotD } = require("./lib/pickEngine");
const { readDB, writeDB } = require("../db");

// ─── Team name fuzzy matching ───
function norm(name) {
  return (name || "")
    .toLowerCase()
    .replace(/\s*(fc|sc|ac|cf|cd|if|fk|sk|bk|nk|afc|rj|sp|ec|se)\s*/gi, " ")
    .replace(/[^a-z0-9]/g, "").trim();
}
function similarity(a, b) {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const tri = new Set();
  for (let i = 0; i <= a.length - 3; i++) tri.add(a.slice(i, i+3));
  let c = 0;
  for (let i = 0; i <= b.length - 3; i++) if (tri.has(b.slice(i, i+3))) c++;
  return c / Math.max(tri.size, b.length - 2, 1);
}
function findOdds(oddsMap, home, away) {
  if (oddsMap.has(`${home}|${away}`)) return oddsMap.get(`${home}|${away}`);
  const nh = norm(home), na = norm(away);
  let best = 0, bestVal = null;
  for (const [key, val] of oddsMap.entries()) {
    const [kh, ka] = key.split("|");
    const score = (similarity(nh, norm(kh)) + similarity(na, norm(ka))) / 2;
    if (score > best) { best = score; bestVal = val; }
  }
  if (best >= 0.70) return bestVal;
  return null;
}

// ─── Date helpers ───
function getDateRange(daysAhead) {
  const dates = [];
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// ─── 1. SYNC FIXTURES ───
async function syncFixtures(daysAhead = 5) {
  const result = { synced: 0, skipped: 0, errors: 0, dates: [] };
  const db = await readDB();
  if (!db.matches) db.matches = {};
  if (!db.scheduleByDate) db.scheduleByDate = {};

  const dates = getDateRange(daysAhead);
  result.dates = dates;

  for (const date of dates) {
    console.log(`[fixtures] Fetching all leagues for ${date}...`);
    let fixtures;
    try {
      fixtures = await getFixturesByDate(date);
    } catch (err) {
      console.error(`[fixtures] Error ${date}: ${err.message}`);
      result.errors++;
      continue;
    }

    console.log(`[fixtures] ${fixtures.length} fixtures for ${date}`);
    db.scheduleByDate[date] = []; // reset schedule for this date

    for (const fixture of fixtures) {
      try {
        const teams = fixture.teams;
        if (!teams.home.name || !teams.away.name ||
            teams.home.name === "TBD" || teams.away.name === "TBD") {
          result.skipped++;
          continue;
        }

        const match = fixtureToMatch(fixture);

        // Preserve existing enrichment
        const existing = db.matches[match.id];
        if (existing) {
          match.odds = existing.odds?.home !== "-" ? existing.odds : match.odds;
          match.pick = existing.pick !== "-" ? existing.pick : match.pick;
          match.goals = existing.goals !== "-" ? existing.goals : match.goals;
          match.analysis = existing.analysis || match.analysis;
          match.homeForm = existing.homeForm !== "DDDDD" ? existing.homeForm : match.homeForm;
          match.awayForm = existing.awayForm !== "DDDDD" ? existing.awayForm : match.awayForm;
        }

        db.matches[match.id] = match;

        // Add to schedule group
        let group = db.scheduleByDate[date].find(g => g.league === match.league);
        if (!group) {
          group = { league: match.league, flag: match.flag, matchIds: [] };
          db.scheduleByDate[date].push(group);
        }
        if (!group.matchIds.includes(match.id)) group.matchIds.push(match.id);
        result.synced++;
      } catch (err) {
        console.error(`[fixtures] Error: ${err.message}`);
        result.errors++;
      }
    }
  }

  await writeDB(db);
  console.log(`[fixtures] Done — Synced:${result.synced} Skipped:${result.skipped} Errors:${result.errors}`);
  return result;
}

// ─── 2. SYNC TEAM FORM ───
// Fetches real W/D/L form for all upcoming matches.
// Costs 2 API calls per match (home + away team).
// Run this AFTER sync-fixtures, BEFORE enrich-matches.
// To conserve quota, only fetches form for matches without real form data.
async function syncForm(daysAhead = 2) {
  const result = { updated: 0, skipped: 0, errors: 0 };
  const db = await readDB();
  const dates = getDateRange(daysAhead);

  const matchIds = new Set();
  dates.forEach(date => {
    (db.scheduleByDate[date] || []).forEach(g => g.matchIds.forEach(id => matchIds.add(id)));
  });

  console.log(`[form] Fetching form for ${matchIds.size} matches across ${daysAhead} days...`);

  for (const id of matchIds) {
    const match = db.matches[id];
    if (!match) continue;

    // Skip if already has real form
    if (match.homeForm !== "DDDDD" && match.awayForm !== "DDDDD") {
      result.skipped++;
      continue;
    }

    try {
      // Home team form
      if (match.homeTeamId && match.homeForm === "DDDDD") {
        const homeFixtures = await getTeamForm(match.homeTeamId);
        const form = buildForm(homeFixtures, match.homeTeamId);
        if (form) db.matches[id].homeForm = form;
      }

      // Away team form
      if (match.awayTeamId && match.awayForm === "DDDDD") {
        const awayFixtures = await getTeamForm(match.awayTeamId);
        const form = buildForm(awayFixtures, match.awayTeamId);
        if (form) db.matches[id].awayForm = form;
      }

      console.log(`  [form] ${match.home} (${db.matches[id].homeForm}) vs ${match.away} (${db.matches[id].awayForm})`);
      result.updated++;

      // Small delay to stay within rate limit (10 req/min on free tier)
      await new Promise(r => setTimeout(r, 700));
    } catch (err) {
      console.error(`  [form] Error for ${id}: ${err.message}`);
      result.errors++;
    }
  }

  await writeDB(db);
  console.log(`[form] Done — Updated:${result.updated} Skipped:${result.skipped} Errors:${result.errors}`);
  return result;
}

// ─── 3. SYNC LIVESCORES ───
async function syncLivescores() {
  const result = { live: 0, errors: 0 };
  console.log("[livescores] Fetching all live matches globally...");

  let fixtures;
  try {
    fixtures = await getLiveFixtures();
  } catch (err) {
    console.error(`[livescores] Error: ${err.message}`);
    throw err;
  }

  console.log(`[livescores] ${fixtures.length} live matches found`);

  const db = await readDB();

  // Build new live list from real API data
  // Also keep recently finished matches (last 2 hours)
  const now = Date.now();
  const twoHoursAgo = now - 2 * 60 * 60 * 1000;

  // Start fresh — remove stale/demo data
  const liveMap = new Map();

  // Keep recently finished real matches (have af_ prefix)
  (db.liveMatches || [])
    .filter(m => m.id.startsWith("af_") && m.status === "finished")
    .forEach(m => liveMap.set(m.id, m));

  // Add/update current live
  for (const fixture of fixtures) {
    try {
      const lm = fixtureToLiveMatch(fixture);
      liveMap.set(lm.id, lm);
      result.live++;
    } catch (err) {
      result.errors++;
    }
  }

  db.liveMatches = Array.from(liveMap.values());

  // If no live matches, add upcoming matches from today as "upcoming" status
  if (db.liveMatches.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    const groups = db.scheduleByDate[today] || [];
    const upcoming = [];
    for (const g of groups) {
      for (const id of g.matchIds.slice(0, 5)) { // max 5 per league
        const m = db.matches[id];
        if (m) {
          upcoming.push({
            id: m.id,
            league: m.league,
            flag: m.flag,
            date: m.date,
            time: m.time,
            home: m.home,
            away: m.away,
            homeScore: 0,
            awayScore: 0,
            status: "upcoming",
            minute: 0
          });
        }
      }
    }
    db.liveMatches = upcoming.slice(0, 20); // max 20 upcoming shown
  }

  await writeDB(db);
  console.log(`[livescores] Done — Live:${result.live} Errors:${result.errors}`);
  return result;
}

// ─── 4. ENRICH MATCHES ───
async function enrichMatches(daysAhead = 5) {
  const result = { enriched: 0, skipped: 0, errors: 0 };
  const db = await readDB();
  const dates = getDateRange(daysAhead);

  const matchIds = new Set();
  dates.forEach(date =>
    (db.scheduleByDate[date] || []).forEach(g => g.matchIds.forEach(id => matchIds.add(id)))
  );

  if (!matchIds.size) { console.log("[enrich] No matches to enrich."); return result; }
  console.log(`[enrich] Enriching ${matchIds.size} matches...`);

  let oddsMap;
  try {
    oddsMap = await getAllOddsMap();
  } catch (err) {
    console.error(`[enrich] Failed to fetch odds: ${err.message}`);
    throw err;
  }

  for (const id of matchIds) {
    const match = db.matches[id];
    if (!match) continue;
    try {
      const oddsData = findOdds(oddsMap, match.home, match.away);
      if (!oddsData) { result.skipped++; continue; }

      const odds = { home: oddsData.home, draw: oddsData.draw, away: oddsData.away };
      const pick = pickResult(odds, match.homeForm, match.awayForm);
      const goals = pickGoals(odds, match.homeForm, match.awayForm);
      const analysis = generateAnalysis({ ...match, pick }, odds);

      db.matches[id] = { ...match, odds, pick, goals, analysis };
      console.log(`  [enrich] ✓ ${match.home} vs ${match.away} → ${pick} | ${goals} | ${odds.home}/${odds.draw}/${odds.away}`);
      result.enriched++;
    } catch (err) {
      console.error(`  [enrich] ✗ ${id}: ${err.message}`);
      result.errors++;
    }
  }

  // ─── Auto-update Bet of the Day ───
  // Picks the top-scoring matches by confidence for today and tomorrow
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const botdDates = [today, tomorrowStr];
  const candidates = [];

  for (const date of botdDates) {
    (db.scheduleByDate[date] || []).forEach(g => {
      g.matchIds.forEach(id => {
        const m = db.matches[id];
        if (m && m.pick !== "-" && m.odds?.home !== "-") {
          candidates.push({ ...m, _score: scoreBotD(m) });
        }
      });
    });
  }

  candidates.sort((a, b) => b._score - a._score);

  // Top picks by confidence score
  const valueBetIds = candidates
    .filter(m => {
      const fav = Math.min(parseFloat(m.odds.home), parseFloat(m.odds.away));
      return fav >= 1.5 && fav <= 2.5; // value range
    })
    .slice(0, 12)
    .map(m => m.id);

  const bankerIds = candidates
    .filter(m => {
      const fav = Math.min(parseFloat(m.odds.home), parseFloat(m.odds.away));
      return fav <= 1.6; // short-price bankers
    })
    .slice(0, 10)
    .map(m => m.id);

  // Build league groups for betOfTheDay
  function buildGroups(ids) {
    const groups = [];
    ids.forEach(id => {
      const m = db.matches[id];
      if (!m) return;
      let g = groups.find(x => x.league === m.league);
      if (!g) {
        g = { league: m.league, flag: m.flag, matchIds: [] };
        groups.push(g);
      }
      g.matchIds.push(id);
    });
    return groups;
  }

  db.betOfTheDay = {
    valueBets: buildGroups(valueBetIds),
    bankers: buildGroups(bankerIds)
  };

  console.log(`[botd] Updated — ${valueBetIds.length} value bets, ${bankerIds.length} bankers`);

  await writeDB(db);
  console.log(`[enrich] Done — Enriched:${result.enriched} Skipped:${result.skipped} Errors:${result.errors}`);
  return result;
}

// ─── 5. RESET DB ───
// Clears stale sample/demo data, preserves blogs and payment inquiries
async function resetDB() {
  const db = await readDB();
  db.matches = {};
  db.scheduleByDate = {};
  db.betOfTheDay = { valueBets: [], bankers: [] };
  db.liveMatches = [];
  // Keep blogs and paymentInquiries
  await writeDB(db);
  console.log("[reset] Database cleared. Run sync-fixtures + enrich-matches to repopulate.");
  return { success: true };
}

module.exports = { syncFixtures, syncForm, syncLivescores, enrichMatches, resetDB };
