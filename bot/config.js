// bot/config.js
//
// Data source: football-data.org (https://www.football-data.org)
// Free tier: 10 requests/minute, no credit card required, permanent (not a
// trial). Covers a fixed set of "Tier One" competitions on the free plan —
// see COMPETITION_CODES below for the default list.
//
// Trade-offs vs a paid API: no live minute-by-minute ticking (scores refresh
// roughly every ~60 seconds while a match is in progress), and no team-form
// history without extra API calls, so homeForm/awayForm are left as
// placeholders for the admin to fill in manually.

const DEFAULT_COMPETITION_CODES = ["PL", "PD", "SA", "BL1", "FL1"];
// PL = Premier League, PD = La Liga, SA = Serie A, BL1 = Bundesliga, FL1 = Ligue 1
// Other free-tier options include: CL (Champions League), ELC (Championship),
// DED (Eredivisie), PPL (Primeira Liga), BSA (Brasileirão)

const COMPETITION_CODES = process.env.BOT_COMPETITION_CODES
  ? process.env.BOT_COMPETITION_CODES.split(",").map((s) => s.trim())
  : DEFAULT_COMPETITION_CODES;

const FIXTURE_DAYS_AHEAD = parseInt(process.env.BOT_FIXTURE_DAYS_AHEAD || "5", 10);

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4";

const API_BASE_URL = process.env.API_BASE_URL; // your own Render backend URL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD; // your own backend's admin password

module.exports = {
  COMPETITION_CODES,
  FIXTURE_DAYS_AHEAD,
  FOOTBALL_DATA_API_KEY,
  FOOTBALL_DATA_BASE_URL,
  API_BASE_URL,
  ADMIN_PASSWORD
};
