// bot/lib/footballData.js
const { FOOTBALL_DATA_BASE_URL, FOOTBALL_DATA_API_KEY } = require("../config");

async function footballDataGet(path, params = {}) {
  if (!FOOTBALL_DATA_API_KEY) {
    throw new Error("FOOTBALL_DATA_API_KEY is not set. Add it as an environment variable / GitHub secret.");
  }

  const url = new URL(`${FOOTBALL_DATA_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  });

  const res = await fetch(url.toString(), {
    headers: { "X-Auth-Token": FOOTBALL_DATA_API_KEY }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`football-data.org request failed (${res.status}): ${text}`);
  }

  return res.json();
}

// All matches for one competition within a date range (YYYY-MM-DD strings)
async function getCompetitionMatches(competitionCode, dateFrom, dateTo) {
  const data = await footballDataGet(`/competitions/${competitionCode}/matches`, {
    dateFrom,
    dateTo
  });
  return data.matches || [];
}

// All currently in-progress matches across every competition you have
// access to on your plan (single request, very rate-limit friendly)
async function getLiveMatches() {
  const data = await footballDataGet("/matches", { status: "LIVE" });
  return data.matches || [];
}

module.exports = { getCompetitionMatches, getLiveMatches };
