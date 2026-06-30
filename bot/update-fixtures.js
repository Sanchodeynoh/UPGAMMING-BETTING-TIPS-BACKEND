// bot/update-fixtures.js
//
// Run this once a day (via GitHub Actions cron). Pulls upcoming fixtures
// for the competitions configured in config.js, for the next
// FIXTURE_DAYS_AHEAD days, and upserts them into your backend via the
// admin API.
//
// Odds, pick, goals-tip, form, and analysis are intentionally left blank —
// see lib/mapData.js for why. Fill those in via the admin dashboard once
// the fixture shows up.

const { COMPETITION_CODES, FIXTURE_DAYS_AHEAD } = require("./config");
const { getCompetitionMatches } = require("./lib/footballData");
const { matchToSiteMatch } = require("./lib/mapData");
const { upsertMatch } = require("./lib/ownApi");

function dateRange(daysAhead) {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + daysAhead);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10)
  };
}

async function run() {
  const { dateFrom, dateTo } = dateRange(FIXTURE_DAYS_AHEAD);
  let totalSynced = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const code of COMPETITION_CODES) {
    console.log(`Fetching ${code} matches from ${dateFrom} to ${dateTo}...`);

    let matches;
    try {
      matches = await getCompetitionMatches(code, dateFrom, dateTo);
    } catch (err) {
      console.error(`  Failed to fetch ${code}: ${err.message}`);
      totalErrors++;
      continue;
    }

    if (!matches.length) {
      console.log("  No matches in this date range.");
      continue;
    }

    for (const match of matches) {
      // Knockout-stage placeholder fixtures (e.g. "Winner Group A vs
      // Runner-up Group B") don't have real team names assigned yet —
      // skip these quietly rather than counting them as errors. They'll
      // sync automatically once the actual teams are determined.
      if (!match.homeTeam || !match.homeTeam.name || !match.awayTeam || !match.awayTeam.name) {
        totalSkipped++;
        continue;
      }

      try {
        const siteMatch = matchToSiteMatch(match);
        await upsertMatch(siteMatch);
        console.log(`  Synced: ${siteMatch.home} vs ${siteMatch.away} on ${siteMatch.date} (${siteMatch.id})`);
        totalSynced++;
      } catch (err) {
        console.error(`  Failed to sync match ${match.id}: ${err.message}`);
        totalErrors++;
      }
    }

    // Free tier is 10 requests/minute — small pause between competitions
    // keeps us comfortably under that even with several competitions.
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  console.log(`\nDone. Synced ${totalSynced} matches, ${totalSkipped} skipped (TBD teams), ${totalErrors} real errors.`);
  if (totalErrors > 0) process.exitCode = 1;
}

run().catch((err) => {
  console.error("Fatal error in update-fixtures:", err);
  process.exit(1);
});
