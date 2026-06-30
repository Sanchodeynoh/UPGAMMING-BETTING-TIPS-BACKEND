// bot/config.js
//
// League IDs are from API-Football (https://www.api-football.com/documentation-v3).
// You can find more league IDs in their docs or via the /leagues endpoint.
// Override the default list by setting BOT_LEAGUE_IDS as a comma-separated
// string in your environment, e.g. "39,140,135" (Premier League, La Liga, Serie A).

const DEFAULT_LEAGUE_IDS = [
  39,  // Premier League (England)
  140, // La Liga (Spain)
  135, // Serie A (Italy)
  78,  // Bundesliga (Germany)
  61   // Ligue 1 (France)
];

const LEAGUE_IDS = process.env.BOT_LEAGUE_IDS
  ? process.env.BOT_LEAGUE_IDS.split(",").map((s) => parseInt(s.trim(), 10))
  : DEFAULT_LEAGUE_IDS;

// How many days ahead to pull fixtures for in the daily sync.
const FIXTURE_DAYS_AHEAD = parseInt(process.env.BOT_FIXTURE_DAYS_AHEAD || "5", 10);

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
const API_FOOTBALL_HOST = "v3.football.api-sports.io";
const API_FOOTBALL_BASE_URL = `https://${API_FOOTBALL_HOST}`;

const API_BASE_URL = process.env.API_BASE_URL; // your own Render backend URL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD; // your own backend's admin password

module.exports = {
  LEAGUE_IDS,
  FIXTURE_DAYS_AHEAD,
  API_FOOTBALL_KEY,
  API_FOOTBALL_HOST,
  API_FOOTBALL_BASE_URL,
  API_BASE_URL,
  ADMIN_PASSWORD
};

