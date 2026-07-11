// bot/lib/mapDataAF.js
const { getFlag } = require("./flags");

// Leagues to include — covers World Cup, club friendlies, European competitions,
// South American, African, Asian, and all major domestic leagues requested.
// API-Football IDs reference: https://www.api-football.com/documentation-v3#tag/Leagues
const INCLUDED_LEAGUE_IDS = new Set([
  // International / World
  1,    // World Cup
  4,    // Euro Championship
  5,    // UEFA Nations League
  6,    // Africa Cup of Nations
  7,    // Asian Cup
  9,    // Copa America
  10,   // CONCACAF Gold Cup
  848,  // International Friendlies
  // Club competitions
  2,    // Champions League
  3,    // Europa League
  848,  // Club Friendlies
  535,  // Club Friendlies
  667,  // Club Friendlies
  // UEFA qualifications / conference
  848,  // UEFA Conference League Qualification
  // England
  39,   // Premier League
  40,   // Championship
  41,   // League One
  48,   // FA Cup
  // France
  61,   // Ligue 1
  62,   // Ligue 2
  66,   // Coupe de France
  // Germany
  78,   // Bundesliga
  79,   // 2. Bundesliga
  81,   // DFB Pokal
  // Spain
  140,  // La Liga
  141,  // Segunda División
  143,  // Copa del Rey
  556,  // Super Cup Spain
  // Italy
  135,  // Serie A
  136,  // Serie B
  137,  // Coppa Italia
  // Netherlands
  88,   // Eredivisie
  89,   // Eerste Divisie
  // Portugal
  94,   // Primeira Liga
  96,   // Taça de Portugal
  // Belgium
  144,  // Pro League
  // Turkey
  203,  // Süper Lig
  // Greece
  197,  // Super League
  // Russia
  235,  // Premier League Russia
  // Ukraine
  333,  // Premier League Ukraine
  // Scotland
  179,  // Scottish Premiership
  // Argentina
  128,  // Liga Profesional
  130,  // Copa de la Liga
  131,  // Copa Argentina
  // Brazil
  71,   // Brasileirão Serie A
  72,   // Brasileirão Serie B
  75,   // Copa do Brasil
  // Chile
  265,  // Primera División Chile
  266,  // Copa Chile
  267,  // Copa de la Liga Chile
  // Colombia
  239,  // Liga BetPlay
  // Mexico
  262,  // Liga MX
  263,  // Copa MX
  // USA & Canada
  253,  // MLS
  254,  // US Open Cup
  321,  // Canadian Championship
  // Belarus
  370,  // Belarus Premier League
  // China
  169,  // Chinese Super League
  // Finland
  244,  // Veikkausliiga
  245,  // Finland Ykkonen
  // Japan
  98,   // J1 League
  99,   // J2 League
  // South Korea
  292,  // K League 1
  // Australia
  188,  // A-League
  // Nigeria
  363,  // Nigeria Premier League
  // South Africa
  288,  // South Africa Premier Division
  // Kenya
  335,  // Kenya Premier League
  // Ghana
  384,  // Ghana Premier League
  // Egypt
  233,  // Egypt Premier League
  // Morocco
  200,  // Botola Pro
  // Saudi Arabia
  307,  // Saudi Pro League
  // UAE
  435,  // UAE Pro League
  // Israel
  384,  // Israel Premier League (approx)
]);

function mapStatus(s) {
  if (["1H","2H","HT","ET","P","BT","LIVE"].includes(s)) return "live";
  if (["FT","AET","PEN"].includes(s)) return "finished";
  return "upcoming";
}

function buildForm(fixtures, teamId) {
  if (!fixtures || fixtures.length === 0) return null;
  return fixtures
    .slice(-5)
    .map(f => {
      const isHome = f.teams.home.id === teamId;
      const hg = f.goals.home, ag = f.goals.away;
      if (hg === null || ag === null) return "D";
      if (hg === ag) return "D";
      return (isHome ? hg > ag : ag > hg) ? "W" : "L";
    })
    .join("")
    .padEnd(5, "D")
    .slice(0, 5);
}

function shouldInclude(leagueId) {
  // Include all leagues on free tier — filter is advisory only
  // If INCLUDED_LEAGUE_IDS is empty, include everything
  return true; // show all leagues API-Football returns
}

function fixtureToMatch(fixture) {
  const f = fixture.fixture;
  const league = fixture.league;
  const teams = fixture.teams;
  const goals = fixture.goals;

  const dateObj = new Date(f.date);
  const date = dateObj.toISOString().slice(0, 10);
  const time = dateObj.toISOString().slice(11, 16);

  const country = league.country || "";
  const isIntl = ["World","Europe","Africa","Asia","CONCACAF","South-America"].includes(country.replace(/\s/g,"-"));
  const displayLeague = isIntl ? league.name : `${country} — ${league.name}`;

  return {
    id: `af_${f.id}`,
    fixtureApiId: f.id,
    homeTeamId: teams.home.id,
    awayTeamId: teams.away.id,
    league: displayLeague,
    flag: getFlag(country),
    date,
    time,
    home: teams.home.name,
    away: teams.away.name,
    homeForm: "DDDDD",
    awayForm: "DDDDD",
    odds: { home: "-", draw: "-", away: "-" },
    pick: "-",
    goals: "-",
    score: goals.home !== null ? `${goals.home}:${goals.away}` : "-",
    venue: f.venue?.name || "",
    analysis: ""
  };
}

function fixtureToLiveMatch(fixture) {
  const f = fixture.fixture;
  const league = fixture.league;
  const teams = fixture.teams;
  const goals = fixture.goals;
  const dateObj = new Date(f.date);
  return {
    id: `af_${f.id}`,
    league: league.name,
    flag: getFlag(league.country || ""),
    date: dateObj.toISOString().slice(0, 10),
    time: dateObj.toISOString().slice(11, 16),
    home: teams.home.name,
    away: teams.away.name,
    homeScore: goals.home ?? 0,
    awayScore: goals.away ?? 0,
    status: mapStatus(f.status.short),
    minute: f.status.elapsed || 0
  };
}

module.exports = { fixtureToMatch, fixtureToLiveMatch, buildForm, shouldInclude };
