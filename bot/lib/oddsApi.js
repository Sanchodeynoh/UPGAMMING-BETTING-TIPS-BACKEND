// bot/lib/oddsApi.js
const ODDS_API_KEY = process.env.ODDS_API_KEY;
const BASE_URL = "https://api.the-odds-api.com/v4";

const SPORT_KEYS = [
  "soccer_fifa_world_cup",
  "soccer_brazil_campeonato",
  "soccer_conmebol_copa_libertadores",
  "soccer_epl",
  "soccer_spain_la_liga",
  "soccer_italy_serie_a",
  "soccer_germany_bundesliga",
  "soccer_france_ligue_one"
];

async function getOddsForSport(sportKey) {
  if (!ODDS_API_KEY) throw new Error("ODDS_API_KEY is not set.");

  const url = new URL(`${BASE_URL}/sports/${sportKey}/odds`);
  url.searchParams.set("apiKey", ODDS_API_KEY);
  url.searchParams.set("regions", "eu");
  url.searchParams.set("markets", "h2h");
  url.searchParams.set("oddsFormat", "decimal");

  const res = await fetch(url.toString());
  if (res.status === 422 || res.status === 404) return [];
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Odds API error ${sportKey} (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data || [];
}

async function getAllOddsMap() {
  const map = new Map();

  for (const sportKey of SPORT_KEYS) {
    let events;
    try {
      events = await getOddsForSport(sportKey);
    } catch (err) {
      console.warn(`  Odds fetch failed for ${sportKey}: ${err.message}`);
      continue;
    }
    for (const event of events) {
      const bookmaker = event.bookmakers && event.bookmakers[0];
      if (!bookmaker) continue;
      const h2h = bookmaker.markets.find((m) => m.key === "h2h");
      if (!h2h) continue;
      const outcomes = h2h.outcomes;
      const homeOut = outcomes.find((o) => o.name === event.home_team);
      const awayOut = outcomes.find((o) => o.name === event.away_team);
      const drawOut = outcomes.find((o) => o.name === "Draw");
      if (!homeOut || !awayOut) continue;

      // Store under BOTH team-name orderings for robustness
      const val = {
        home: homeOut.price.toFixed(2),
        draw: drawOut ? drawOut.price.toFixed(2) : "-",
        away: awayOut.price.toFixed(2),
        homeTeam: event.home_team,
        awayTeam: event.away_team
      };
      map.set(`${event.home_team}|${event.away_team}`, val);
    }
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log(`  Odds map: ${map.size} fixtures`);
  return map;
}

module.exports = { getAllOddsMap };
