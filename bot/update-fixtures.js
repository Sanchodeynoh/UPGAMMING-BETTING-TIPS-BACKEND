// bot/update-fixtures.js
//
// Run this once a day (via GitHub Actions cron). It pulls upcoming fixtures
// for the leagues configured in config.js, for the next FIXTURE_DAYS_AHEAD
// days, and upserts them into your backend via the admin API.
//
// Odds, pick, goals-tip, and analysis are intentionally left blank/placeholder
// — API-Football's free tier doesn't include real odds, and auto-generating
// confident-sounding picks without real data would be misleading. Fill those
// in via the admin dashboard once the fixture shows up.

const { LEAGUE_IDS, FIXTURE_DAYS_AHEAD } = require("./config");
const { getFixturesByLeagueAndDate, getTeamLastFixtures } = require("./lib/apiFootball");
const { buildFormString, fixtureToMatch } = require("./lib/mapData");
const { upsertMatch } = require("./lib/ownApi");

function dateStringsAhead(days) {
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function currentSeasonYear() {
  // API-Football "season" is generally the year the season started.
  // This is a reasonable default; override by passing season explicitly
  // if you track competitions whose season spans a different convention.
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

async function run() {
  const dates = dateStringsAhead(FIXTURE_DAYS_AHEAD);
  const season = currentSeasonYear();
  let totalSynced = 0;
  let totalErrors = 0;

  for (const leagueId of LEAGUE_IDS) {
    for (const date of dates) {
      console.log(`Fetching league ${leagueId} fixtures for ${date}...`);

      let fixtures;
      try {
        fixtures = await getFixturesByLeagueAndDate(leagueId, date, season);
      } catch (err) {
        console.error(`  Failed to fetch fixtures: ${err.message}`);
        totalErrors++;
        continue;
      }

      if (!fixtures || fixtures.length === 0) {
        console.log("  No fixtures.");
        continue;
      }

      for (const fixture of fixtures) {
        try {
          const teams = fixture.teams;

          // Form lookups cost extra API calls — keep this lean since the
          // free tier has a daily request cap. Skip if you hit rate limits.
          let homeForm = "DDDDD";
          let awayForm = "DDDDD";
          try {
            const homeRecent = await getTeamLastFixtures(teams.home.id, 5);
            homeForm = buildFormString(homeRecent, teams.home.id);
            const awayRecent = await getTeamLastFixtures(teams.away.id, 5);
            awayForm = buildFormString(awayRecent, teams.away.id);
          } catch (formErr) {
            console.warn(`  Could not fetch form for ${teams.home.name}/${teams.away.name}: ${formErr.message}`);
          }

          const match = fixtureToMatch(fixture, homeForm, awayForm);
          await upsertMatch(match);
          console.log(`  Synced: ${match.home} vs ${match.away} (${match.id})`);
          totalSynced++;
        } catch (err) {
          console.error(`  Failed to sync fixture ${fixture.fixture.id}: ${err.message}`);
          totalErrors++;
        }
      }
    }
  }

  console.log(`\nDone. Synced ${totalSynced} matches, ${totalErrors} errors.`);
  if (totalErrors > 0) process.exitCode = 1;
}

run().catch((err) => {
  console.error("Fatal error in update-fixtures:", err);
  process.exit(1);
});
