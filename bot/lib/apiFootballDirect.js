// bot/lib/apiFootballDirect.js
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
const BASE = "https://v3.football.api-sports.io";

async function afGet(path, params = {}) {
  if (!API_FOOTBALL_KEY) throw new Error("API_FOOTBALL_KEY not set on Render.");
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": API_FOOTBALL_KEY }
  });
  if (!res.ok) throw new Error(`API-Football (${res.status}): ${await res.text()}`);
  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length > 0) {
    const errs = Object.values(data.errors);
    if (errs.length) throw new Error(`AF errors: ${JSON.stringify(data.errors)}`);
  }
  const remaining = res.headers.get("x-ratelimit-requests-remaining");
  if (remaining !== null) console.log(`  [AF] quota remaining: ${remaining}`);
  return data.response || [];
}

// All fixtures for a date — covers every league globally in one request
async function getFixturesByDate(date) {
  return afGet("/fixtures", { date, timezone: "UTC" });
}

// All currently live fixtures
async function getLiveFixtures() {
  return afGet("/fixtures", { live: "all" });
}

// Team's last 5 fixtures for form calculation
async function getTeamForm(teamId) {
  return afGet("/fixtures", { team: teamId, last: 5 });
}

module.exports = { getFixturesByDate, getLiveFixtures, getTeamForm };
