// bot/update-livescores.js
//
// Run this frequently (every 5-15 minutes via GitHub Actions cron) while
// matches are in progress. Pulls all currently-live fixtures from
// API-Football and upserts them into your backend's livescores.
//
// NOTE: this fetches ALL live fixtures globally, not filtered by your
// configured leagues, since API-Football's live endpoint doesn't support
// filtering by a league list directly. We filter client-side instead.

const { LEAGUE_IDS } = require("./config");
const { getLiveFixtures } = require("./lib/apiFootball");
const { fixtureToLiveMatch } = require("./lib/mapData");
const { upsertLiveMatch } = require("./lib/ownApi");

async function run() {
  console.log("Fetching live fixtures...");

  let fixtures;
  try {
    fixtures = await getLiveFixtures();
  } catch (err) {
    console.error(`Failed to fetch live fixtures: ${err.message}`);
    process.exit(1);
  }

  if (!fixtures || fixtures.length === 0) {
    console.log("No live fixtures right now.");
    return;
  }

  const leagueIdSet = new Set(LEAGUE_IDS);
  const relevant = fixtures.filter((f) => leagueIdSet.has(f.league.id));

  console.log(`${fixtures.length} live fixtures globally, ${relevant.length} in your configured leagues.`);

  let synced = 0;
  let errors = 0;

  for (const fixture of relevant) {
    try {
      const liveMatch = fixtureToLiveMatch(fixture);
      await upsertLiveMatch(liveMatch);
      console.log(`  Synced: ${liveMatch.home} ${liveMatch.homeScore}-${liveMatch.awayScore} ${liveMatch.away} (${liveMatch.minute}')`);
      synced++;
    } catch (err) {
      console.error(`  Failed to sync live fixture ${fixture.fixture.id}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nDone. Synced ${synced} live matches, ${errors} errors.`);
  if (errors > 0) process.exitCode = 1;
}

run().catch((err) => {
  console.error("Fatal error in update-livescores:", err);
  process.exit(1);
});
