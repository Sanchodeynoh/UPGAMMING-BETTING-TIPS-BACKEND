// bot/lib/apiFootball.js
const { API_FOOTBALL_BASE_URL, API_FOOTBALL_HOST, API_FOOTBALL_KEY } = require("../config");

async function apiFootballGet(path, params = {}) {
  if (!API_FOOTBALL_KEY) {
    throw new Error("API_FOOTBALL_KEY is not set. Add it as an environment variable / GitHub secret.");
  }

  const url = new URL(`${API_FOOTBALL_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  });

  const res = await fetch(url.toString(), {
    headers: {
      "x-rapidapi-host": API_FOOTBALL_HOST,
      "x-rapidapi-key": API_FOOTBALL_KEY
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API-Football request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API-Football returned errors: ${JSON.stringify(data.errors)}`);
  }
  return data.response;
}

// Fixtures for a specific league + date (YYYY-MM-DD)
function getFixturesByLeagueAndDate(leagueId, date, season) {
  return apiFootballGet("/fixtures", { league: leagueId, date, season });
}

// Currently live fixtures across all leagues (or filtered by league ids if needed)
function getLiveFixtures() {
  return apiFootballGet("/fixtures", { live: "all" });
}

// Team's last N results (used to build a simple form string like "WWDLW")
function getTeamLastFixtures(teamId, count = 5) {
  return apiFootballGet("/fixtures", { team: teamId, last: count });
}

module.exports = {
  getFixturesByLeagueAndDate,
  getLiveFixtures,
  getTeamLastFixtures
};
