// data.js
// Sample match data keyed by date (YYYY-MM-DD).
// Replace this with a real database or external API integration later.

const matchData = {
  "2026-06-28": {
    league: "World Cup 2026",
    flag: "🏆",
    matches: [
      {
        time: "00:30",
        home: "DR Congo",
        away: "Uzbekistan",
        homeForm: "LDLDW",
        awayForm: "LLLLD",
        odds: ["1.73", "4", "4.33"],
        pick: "1",
        goals: "U",
        score: "1:0"
      },
      {
        time: "00:30",
        home: "Colombia",
        away: "Portugal",
        homeForm: "WWWWL",
        awayForm: "WDWWW",
        odds: ["3.9", "3.6", "1.91"],
        pick: "X2",
        goals: "O",
        score: "1:2"
      }
    ]
  },
  "2026-06-29": {
    league: "World Cup 2026",
    flag: "🏆",
    matches: [
      {
        time: "18:00",
        home: "Brazil",
        away: "Germany",
        homeForm: "WWDWW",
        awayForm: "WLDWW",
        odds: ["2.1", "3.3", "3.0"],
        pick: "1",
        goals: "O",
        score: "2:1"
      },
      {
        time: "21:00",
        home: "Argentina",
        away: "Japan",
        homeForm: "WWWLW",
        awayForm: "DWLWD",
        odds: ["1.55", "3.9", "5.5"],
        pick: "1",
        goals: "U",
        score: "2:0"
      }
    ]
  },
  "2026-06-30": {
    league: "Premier League",
    flag: "⚽",
    matches: [
      {
        time: "15:00",
        home: "Arsenal",
        away: "Chelsea",
        homeForm: "WWDWL",
        awayForm: "DWWLW",
        odds: ["2.0", "3.4", "3.6"],
        pick: "1",
        goals: "O",
        score: "2:1"
      }
    ]
  }
};

module.exports = matchData;
