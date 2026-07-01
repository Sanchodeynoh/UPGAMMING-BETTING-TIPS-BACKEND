// bot/update-livescores.js
//
// Run this every ~10-15 minutes via GitHub Actions cron while matches are
// in progress. Pulls all currently in-play matches from football-data.org
// (single API request) and upserts them into your backend's livescores.
//
// NOTE: the free tier doesn't include a live minute counter — see
// lib/mapData.js. Scores will update each time this runs, but there's no
// real-time ticking clock.

const { getLiveMatches } = require("./lib/footballData");
const { matchToLiveMatch } = require("./lib/mapData");
const { upsertLiveMatch } = require("./lib/ownApi");

async function run() {
  console.log("Fetching live matches...");

  let matches;
  try {
    matches = await getLiveMatches();
  } catch (err) {
    console.error(`Failed to fetch live matches: ${err.message}`);
    process.exit(1);
  }

  if (!matches.length) {
    console.log("No live matches right now.");
    return;
  }

  console.log(`${matches.length} live match(es) found.`);

  let synced = 0;
  let errors = 0;

  for (const match of matches) {
    try {
      const liveMatch = matchToLiveMatch(match);
      await upsertLiveMatch(liveMatch);
      console.log(`  Synced: ${liveMatch.home} ${liveMatch.homeScore}-${liveMatch.awayScore} ${liveMatch.away}`);
      synced++;
    } catch (err) {
      console.error(`  Failed to sync live match ${match.id}: ${err.message}`);
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
