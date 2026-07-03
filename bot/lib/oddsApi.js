// bot/lib/oddsApi.js
// Fetches real bookmaker odds from The Odds API (the-odds-api.com)
// Free tier: 500 credits/month. Each request costs 1 credit.

const ODDS_API_KEY = process.env.ODDS_API_KEY;
const BASE_URL = "https://api.the-odds-api.com/v4";

// Sport keys for football competitions on The Odds API
// Full list: https://the-odds-api.com/sports-odds-data/sports-apis.html
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

  if (res.status === 422) {
    // Sport not currently available (off-season) — not an error
    return [];
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Odds API error for ${sportKey} (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data || [];
}

// Returns a flat map of "home_team|away_team" -> { home, draw, away } odds
// Tries all sport keys and merges results
async function getAllOddsMap() {
  const map = new Map();

  for (const sportKey of SPORT_KEYS) {
    let events;
    try {
      events = await getOddsForSport(sportKey);
    } catch (err) {
      console.warn(`  Could not fetch odds for ${sportKey}: ${err.message}`);
      continue;
    }

    for (const event of events) {
      const bookmaker = event.bookmakers && event.bookmakers[0];
      if (!bookmaker) continue;

      const h2h = bookmaker.markets.find((m) => m.key === "h2h");
      if (!h2h) continue;

      const outcomes = h2h.outcomes;
      const homeOutcome = outcomes.find((o) => o.name === event.home_team);
      const awayOutcome = outcomes.find((o) => o.name === event.away_team);
      const drawOutcome = outcomes.find((o) => o.name === "Draw");

      if (!homeOutcome || !awayOutcome) continue;

      const key = `${event.home_team}|${event.away_team}`;
      map.set(key, {
        home: homeOutcome.price.toFixed(2),
        draw: drawOutcome ? drawOutcome.price.toFixed(2) : "-",
        away: awayOutcome.price.toFixed(2),
        commenceTime: event.commence_time
      });
    }

    // Small pause between requests to be kind to the API
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`  Odds map built: ${map.size} matches with odds`);
  return map;
}

module.exports = { getAllOddsMap };
