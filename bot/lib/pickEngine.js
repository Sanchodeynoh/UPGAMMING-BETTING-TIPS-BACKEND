// bot/lib/pickEngine.js

function formScore(formStr) {
  if (!formStr || formStr === "DDDDD") return 0.5;
  const chars = formStr.slice(-5).split("");
  const wins = chars.filter(c => c === "W").length;
  const draws = chars.filter(c => c === "D").length;
  return (wins + draws * 0.4) / chars.length;
}

function pickResult(odds, homeForm, awayForm) {
  const h = parseFloat(odds.home);
  const d = parseFloat(odds.draw);
  const a = parseFloat(odds.away);
  if (isNaN(h) || isNaN(a)) return "-";

  const hFS = formScore(homeForm);
  const aFS = formScore(awayForm);

  if (h <= 1.5 && hFS >= 0.5) return "1";
  if (h <= 1.7 && hFS >= 0.65) return "1";
  if (a <= 1.5 && aFS >= 0.5) return "2";
  if (a <= 1.7 && aFS >= 0.65) return "2";
  if (h < a && h <= 2.2 && hFS > aFS + 0.2) return "1";
  if (a < h && a <= 2.2 && aFS > hFS + 0.2) return "2";
  if (!isNaN(d) && d <= 3.2 && Math.abs(h - a) < 0.3) return "X";
  if (h <= 1.9) return "1X";
  if (a <= 1.9) return "X2";
  return "-";
}

function pickGoals(odds, homeForm, awayForm) {
  const h = parseFloat(odds.home);
  const a = parseFloat(odds.away);
  if (isNaN(h) || isNaN(a)) return "-";

  const hFS = formScore(homeForm);
  const aFS = formScore(awayForm);
  const avg = (hFS + aFS) / 2;

  // Over 2.5 — both teams in good form, open game
  if (avg >= 0.60 && Math.abs(h - a) < 1.0) return "O";
  // Over 2.5 — heavily favoured team with attacking form
  if ((h <= 1.4 && hFS >= 0.75) || (a <= 1.4 && aFS >= 0.75)) return "O";
  // Under 2.5 — one dominant defensive team
  if ((h <= 1.35 && hFS >= 0.80) || (a <= 1.35 && aFS >= 0.80)) return "U";
  // Under 2.5 — both teams in poor form
  if (avg < 0.35) return "U";
  // Under 2.5 — very tight/defensive odds
  if (!isNaN(parseFloat(odds.draw)) && parseFloat(odds.draw) <= 3.0 && Math.abs(h - a) < 0.3) return "U";
  // Default to Over for attacking heavy-favourite games
  if (h <= 1.6 || a <= 1.6) return "O";
  return "O"; // most football matches produce goals — lean toward over
}

function generateAnalysis(match, odds) {
  const { home, away, homeForm, awayForm, pick } = match;
  const h = parseFloat(odds.home);
  const a = parseFloat(odds.away);
  const hFS = formScore(homeForm);
  const aFS = formScore(awayForm);

  const homeTrend = hFS >= 0.65 ? "strong" : hFS >= 0.45 ? "decent" : "poor";
  const awayTrend = aFS >= 0.65 ? "strong" : aFS >= 0.45 ? "decent" : "poor";

  const hForm = homeForm && homeForm !== "DDDDD" ? homeForm : null;
  const aForm = awayForm && awayForm !== "DDDDD" ? awayForm : null;

  let lines = [];

  if (!isNaN(h) && !isNaN(a)) {
    if (h < a - 0.4) {
      lines.push(`${home} are the bookmakers' favourites at ${h}${hForm ? `, backed by ${homeTrend} recent form (${hForm})` : ""}.`);
    } else if (a < h - 0.4) {
      lines.push(`${away} arrive as away favourites at ${a}${aForm ? `, supported by ${awayTrend} recent form (${aForm})` : ""}.`);
    } else {
      lines.push(`The market rates this as a tight contest — ${home} at ${h} versus ${away} at ${a}.`);
    }
  }

  if (hForm && aForm) {
    if (hFS >= 0.7 && aFS <= 0.35) {
      lines.push(`${home} have been in excellent shape while ${away} have struggled for results recently.`);
    } else if (aFS >= 0.7 && hFS <= 0.35) {
      lines.push(`${away} arrive in fine form and look well-placed to take points against a ${home} side out of form.`);
    } else if (hFS >= 0.55 && aFS >= 0.55) {
      lines.push(`Both sides have been in decent form, setting up a competitive, open encounter.`);
    } else {
      lines.push(`Recent form suggests a closely-fought and potentially low-scoring affair.`);
    }
  } else {
    lines.push(`This is a well-matched fixture based on current market pricing.`);
  }

  if (pick === "1") lines.push(`The data firmly backs a ${home} home win.`);
  else if (pick === "2") lines.push(`${away} have the edge despite the away fixture.`);
  else if (pick === "X") lines.push(`A draw looks the most likely outcome given balanced odds and form.`);
  else if (pick === "1X") lines.push(`${home} are unlikely to lose — a win or draw looks the value play.`);
  else if (pick === "X2") lines.push(`${away} look difficult to beat — back them not to lose.`);
  else if (pick === "O") lines.push(`Goals are expected — over 2.5 looks the safe play here.`);
  else if (pick === "U") lines.push(`Expect a tight, low-scoring affair — under 2.5 goals looks the safer pick.`);

  return lines.join(" ");
}

// Scores a match for Bet of the Day selection
// Returns a confidence score 0-100
function scoreBotD(match) {
  const h = parseFloat(match.odds?.home);
  const a = parseFloat(match.odds?.away);
  const d = parseFloat(match.odds?.draw);
  if (isNaN(h) || isNaN(a) || match.pick === "-") return 0;

  const hFS = formScore(match.homeForm);
  const aFS = formScore(match.awayForm);

  let score = 0;

  // Clear favourite (value bet territory)
  const favourite = Math.min(h, a);
  if (favourite <= 1.5) score += 30;
  else if (favourite <= 1.7) score += 20;
  else if (favourite <= 2.0) score += 10;

  // Form alignment
  const pickedFS = match.pick === "1" || match.pick === "1X" ? hFS : aFS;
  score += pickedFS * 40;

  // Not too short (some value)
  if (favourite >= 1.3 && favourite <= 2.2) score += 15;

  // Penalise very uncertain picks
  if (match.pick === "-") score = 0;

  return Math.round(score);
}

module.exports = { pickResult, pickGoals, generateAnalysis, formScore, scoreBotD };
