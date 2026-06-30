// bot/lib/mapData.js

// Builds a "WWDLW"-style form string from a team's recent fixtures.
// teamId = the team we're computing form FOR (so we know home/away per game).
function buildFormString(fixtures, teamId) {
  if (!fixtures || fixtures.length === 0) return "DDDDD";

  return fixtures
    .slice(-5)
    .map((f) => {
      const isHome = f.teams.home.id === teamId;
      const homeGoals = f.goals.home;
      const awayGoals = f.goals.away;
      if (homeGoals === null || awayGoals === null) return "D"; // not finished, fallback

      if (homeGoals === awayGoals) return "D";
      const teamWon = isHome ? homeGoals > awayGoals : awayGoals > homeGoals;
      return teamWon ? "W" : "L";
    })
    .join("")
    .padEnd(5, "D")
    .slice(0, 5);
}

// Converts an API-Football fixture object into our site's match schema.
// homeForm/awayForm are passed in separately since they require extra API calls.
function fixtureToMatch(fixture, homeForm, awayForm) {
  const f = fixture.fixture;
  const league = fixture.league;
  const teams = fixture.teams;
  const goals = fixture.goals;

  const dateObj = new Date(f.date);
  const date = dateObj.toISOString().slice(0, 10);
  const time = dateObj.toISOString().slice(11, 16);

  return {
    id: `af_${f.id}`, // prefix to avoid clashing with any manually-added ids
    league: league.name,
    flag: "⚽",
    date,
    time,
    home: teams.home.name,
    away: teams.away.name,
    homeForm: homeForm || "DDDDD",
    awayForm: awayForm || "DDDDD",
    // NOTE: API-Football's free tier does not include bookmaker odds or
    // win-probability predictions. Odds/pick/goals/analysis are left as
    // placeholders here — fill them in manually via the admin dashboard,
    // or upgrade your API-Football plan to pull real odds automatically.
    odds: { home: "-", draw: "-", away: "-" },
    pick: "-",
    goals: "-",
    score: goals.home !== null ? `${goals.home}:${goals.away}` : "-",
    venue: f.venue && f.venue.name ? f.venue.name : "",
    analysis: "" // left blank intentionally — see note in README about not auto-generating "guaranteed" claims
  };
}

// Converts a live/in-progress fixture into our site's livescore schema.
function fixtureToLiveMatch(fixture) {
  const f = fixture.fixture;
  const league = fixture.league;
  const teams = fixture.teams;
  const goals = fixture.goals;

  let status = "upcoming";
  if (["1H", "2H", "HT", "ET", "P", "LIVE"].includes(f.status.short)) status = "live";
  if (["FT", "AET", "PEN"].includes(f.status.short)) status = "finished";

  const dateObj = new Date(f.date);

  return {
    id: `af_${f.id}`,
    league: league.name,
    flag: "⚽",
    date: dateObj.toISOString().slice(0, 10),
    time: dateObj.toISOString().slice(11, 16),
    home: teams.home.name,
    away: teams.away.name,
    homeScore: goals.home ?? 0,
    awayScore: goals.away ?? 0,
    status,
    minute: f.status.elapsed || 0
  };
}

module.exports = { buildFormString, fixtureToMatch, fixtureToLiveMatch };
    
