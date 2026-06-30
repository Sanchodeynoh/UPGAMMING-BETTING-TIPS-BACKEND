// bot/lib/mapData.js
// Maps football-data.org's response shape into this site's match/livescore schema.

function mapStatus(status) {
  if (["IN_PLAY", "PAUSED"].includes(status)) return "live";
  if (["FINISHED"].includes(status)) return "finished";
  return "upcoming"; // SCHEDULED, TIMED, POSTPONED, SUSPENDED, etc.
}

// Converts a football-data.org match object into our site's match schema.
// homeForm/awayForm are left as placeholders — computing real form would
// cost extra API requests per team, which isn't worth it on a 10 req/min
// free tier. Fill these in manually via the admin dashboard if you want them.
function matchToSiteMatch(match) {
  const dateObj = new Date(match.utcDate);
  const date = dateObj.toISOString().slice(0, 10);
  const time = dateObj.toISOString().slice(11, 16);

  const homeGoals = match.score && match.score.fullTime ? match.score.fullTime.home : null;
  const awayGoals = match.score && match.score.fullTime ? match.score.fullTime.away : null;

  return {
    id: `fd_${match.id}`, // prefix to avoid clashing with manually-added ids
    league: match.competition ? match.competition.name : "Football",
    flag: "⚽",
    date,
    time,
    home: match.homeTeam.name,
    away: match.awayTeam.name,
    homeForm: "DDDDD", // placeholder — fill in manually if desired
    awayForm: "DDDDD", // placeholder — fill in manually if desired
    // NOTE: football-data.org's free tier does not include bookmaker odds.
    // Odds/pick/goals/analysis are left as placeholders — fill them in
    // manually via the admin dashboard once the fixture appears.
    odds: { home: "-", draw: "-", away: "-" },
    pick: "-",
    goals: "-",
    score: homeGoals !== null ? `${homeGoals}:${awayGoals}` : "-",
    venue: match.venue || "",
    analysis: ""
  };
}

// Converts a football-data.org match object into our site's livescore schema.
// NOTE: free tier doesn't provide a live minute counter, only status. We set
// minute to 0; the frontend will show a "LIVE" badge without a ticking clock.
function matchToLiveMatch(match) {
  const dateObj = new Date(match.utcDate);
  const homeGoals = match.score && match.score.fullTime ? match.score.fullTime.home : 0;
  const awayGoals = match.score && match.score.fullTime ? match.score.fullTime.away : 0;

  return {
    id: `fd_${match.id}`,
    league: match.competition ? match.competition.name : "Football",
    flag: "⚽",
    date: dateObj.toISOString().slice(0, 10),
    time: dateObj.toISOString().slice(11, 16),
    home: match.homeTeam.name,
    away: match.awayTeam.name,
    homeScore: homeGoals ?? 0,
    awayScore: awayGoals ?? 0,
    status: mapStatus(match.status),
    minute: 0 // not available on the free tier
  };
}

module.exports = { mapStatus, matchToSiteMatch, matchToLiveMatch };
