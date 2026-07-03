// bot/enrich-matches.js
//
// Runs after update-fixtures.js (daily). For every match in the next
// FIXTURE_DAYS_AHEAD days it:
//   1. Fetches real bookmaker odds from The Odds API
//   2. Picks the tip (1/X/2/1X/X2) using the rule engine
//   3. Picks the goals tip (O/U)
//   4. Generates professional template-based analysis
//   5. Updates the match in your backend via PUT /api/admin/matches/:id
//
// Requires: ODDS_API_KEY, API_BASE_URL, ADMIN_PASSWORD env vars.

const { FIXTURE_DAYS_AHEAD, API_BASE_URL, ADMIN_PASSWORD } = require("./config");
const { getAllOddsMap } = require("./lib/oddsApi");
const { pickResult, pickGoals, generateAnalysis } = require("./lib/pickEngine");

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ADMIN_PASSWORD}`
  };
}

function dateRange(daysAhead) {
  const dates = [];
  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// Fuzzy team name matcher — The Odds API and football-data.org use
// slightly different team name spellings, so we do a loose match
// rather than exact string comparison.
function normalise(name) {
  return (name || "")
    .toLowerCase()
    .replace(/\bfc\b|\bsc\b|\bac\b|\bcf\b|\bcd\b|\bif\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function findOdds(oddsMap, homeTeam, awayTeam) {
  // Try exact key first
  const exactKey = `${homeTeam}|${awayTeam}`;
  if (oddsMap.has(exactKey)) return oddsMap.get(exactKey);

  // Fuzzy match
  const normHome = normalise(homeTeam);
  const normAway = normalise(awayTeam);

  for (const [key, value] of oddsMap.entries()) {
    const [kHome, kAway] = key.split("|");
    if (normalise(kHome) === normHome && normalise(kAway) === normAway) {
      return value;
    }
  }
  return null;
}

async function getMatchesForDates(dates) {
  if (!API_BASE_URL) throw new Error("API_BASE_URL is not set.");

  const allMatches = [];
  for (const date of dates) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/matches/${date}`);
      if (res.status === 404) continue;
      if (!res.ok) continue;
      const data = await res.json();
      const groups = data.groups || [];
      groups.forEach((g) => {
        (g.matches || []).forEach((m) => allMatches.push(m));
      });
    } catch (err) {
      console.warn(`  Could not fetch matches for ${date}: ${err.message}`);
    }
  }
  return allMatches;
}

async function enrichMatch(match, oddsMap) {
  const oddsData = findOdds(oddsMap, match.home, match.away);

  if (!oddsData) {
    console.log(`  No odds found for ${match.home} vs ${match.away} — skipping`);
    return false;
  }

  const odds = {
    home: oddsData.home,
    draw: oddsData.draw,
    away: oddsData.away
  };

  const pick = pickResult(odds, match.homeForm, match.awayForm);
  const goals = pickGoals(odds, match.homeForm, match.awayForm);

  // Build enriched match with pick and analysis
  const enriched = {
    ...match,
    odds,
    pick,
    goals,
    analysis: generateAnalysis({ ...match, pick }, odds)
  };

  // PUT to admin API
  const res = await fetch(`${API_BASE_URL}/api/admin/matches/${match.id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(enriched)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PUT failed for ${match.id} (${res.status}): ${text}`);
  }

  console.log(`  Enriched: ${match.home} vs ${match.away} | pick:${pick} goals:${goals} | odds:${odds.home}/${odds.draw}/${odds.away}`);
  return true;
}

async function run() {
  const dates = dateRange(FIXTURE_DAYS_AHEAD);
  console.log(`Fetching matches for dates: ${dates.join(", ")}`);

  let matches;
  try {
    matches = await getMatchesForDates(dates);
  } catch (err) {
    console.error(`Failed to fetch matches: ${err.message}`);
    process.exit(1);
  }

  console.log(`Found ${matches.length} matches to enrich.`);

  if (!matches.length) {
    console.log("Nothing to do.");
    return;
  }

  console.log("Fetching odds from The Odds API...");
  let oddsMap;
  try {
    oddsMap = await getAllOddsMap();
  } catch (err) {
    console.error(`Failed to fetch odds: ${err.message}`);
    process.exit(1);
  }

  let enriched = 0;
  let skipped = 0;
  let errors = 0;

  for (const match of matches) {
    try {
      const ok = await enrichMatch(match, oddsMap);
      if (ok) enriched++;
      else skipped++;
    } catch (err) {
      console.error(`  Error enriching ${match.id}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nDone. Enriched: ${enriched}, Skipped (no odds): ${skipped}, Errors: ${errors}`);
  if (errors > 0) process.exitCode = 1;
}

run().catch((err) => {
  console.error("Fatal error in enrich-matches:", err);
  process.exit(1);
});
