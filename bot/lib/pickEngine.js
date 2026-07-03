// bot/lib/pickEngine.js
//
// Rule-based engine that decides the tip (1, X, 2, 1X, X2, 12)
// and goals tip (O = over 2.5, U = under 2.5) based on real odds
// and team form. Rules are deliberately conservative — they only
// output a confident pick when the data clearly supports one.

// Convert a form string like "WWDLW" into a win-rate number 0–1
function formScore(formStr) {
  if (!formStr || formStr === "DDDDD") return 0.5;
  const chars = formStr.slice(-5).split("");
  const wins = chars.filter((c) => c === "W").length;
  const draws = chars.filter((c) => c === "D").length;
  return (wins + draws * 0.4) / chars.length;
}

// Determine 1X2 pick from odds + form
function pickResult(odds, homeForm, awayForm) {
  const home = parseFloat(odds.home);
  const draw = parseFloat(odds.draw);
  const away = parseFloat(odds.away);

  if (isNaN(home) || isNaN(away)) return "-";

  const homeFS = formScore(homeForm);
  const awayFS = formScore(awayForm);

  // Strong home favourite: low odds + good form
  if (home <= 1.5 && homeFS >= 0.6) return "1";
  if (home <= 1.7 && homeFS >= 0.7) return "1";

  // Strong away favourite
  if (away <= 1.5 && awayFS >= 0.6) return "2";
  if (away <= 1.7 && awayFS >= 0.7) return "2";

  // Moderate home favourite with clear form edge
  if (home < away && home <= 2.2 && homeFS > awayFS + 0.2) return "1";

  // Moderate away favourite with clear form edge
  if (away < home && away <= 2.2 && awayFS > homeFS + 0.2) return "2";

  // Very tight odds — lean toward draw
  if (!isNaN(draw) && draw <= 3.2 && Math.abs(home - away) < 0.3) return "X";

  // Double chance for risky but likely outcomes
  if (home <= 1.9 && homeFS >= 0.5) return "1X";
  if (away <= 1.9 && awayFS >= 0.5) return "X2";

  return "-"; // not confident enough to pick
}

// Goals tip: over or under 2.5 goals
function pickGoals(odds, homeForm, awayForm) {
  const home = parseFloat(odds.home);
  const away = parseFloat(odds.away);

  if (isNaN(home) || isNaN(away)) return "-";

  const homeFS = formScore(homeForm);
  const awayFS = formScore(awayForm);
  const avgForm = (homeFS + awayFS) / 2;

  // Both sides attack well + open odds = over
  if (avgForm >= 0.65 && Math.abs(home - away) < 0.8) return "O";

  // One side is very dominant defensively (low odds, high form)
  if ((home <= 1.4 && homeFS >= 0.8) || (away <= 1.4 && awayFS >= 0.8)) return "U";

  // Both teams in poor form = under
  if (avgForm < 0.35) return "U";

  return "-";
}

// Generate professional template analysis from match data
function generateAnalysis(match, odds) {
  const home = match.home;
  const away = match.away;
  const homeOdds = parseFloat(odds.home);
  const awayOdds = parseFloat(odds.away);
  const homeFS = formScore(match.homeForm);
  const awayFS = formScore(match.awayForm);
  const pick = match.pick;

  const homeTrend = homeFS >= 0.6 ? "strong" : homeFS >= 0.4 ? "decent" : "poor";
  const awayTrend = awayFS >= 0.6 ? "strong" : awayFS >= 0.4 ? "decent" : "poor";

  let lines = [];

  // Opening line about favouritism
  if (!isNaN(homeOdds) && !isNaN(awayOdds)) {
    if (homeOdds < awayOdds - 0.5) {
      lines.push(`${home} enter this fixture as clear favourites at ${homeOdds}, backed by ${homeTrend} recent form (${match.homeForm || "DDDDD"}).`);
    } else if (awayOdds < homeOdds - 0.5) {
      lines.push(`${away} are the bookmakers' pick at ${awayOdds} despite travelling away, supported by ${awayTrend} form (${match.awayForm || "DDDDD"}).`);
    } else {
      lines.push(`The market sees this as a tight contest — ${home} at ${homeOdds} versus ${away} at ${awayOdds} — and the form backs that up.`);
    }
  }

  // Form analysis
  if (homeFS >= 0.7 && awayFS <= 0.4) {
    lines.push(`${home} have been in excellent shape recently while ${away} have struggled to pick up points, making the home side's case compelling.`);
  } else if (awayFS >= 0.7 && homeFS <= 0.4) {
    lines.push(`${away} arrive in fine form and have a real chance of taking points here against a ${home} side that has underperformed of late.`);
  } else if (homeFS >= 0.6 && awayFS >= 0.6) {
    lines.push(`Both sides arrive in decent shape, which sets up an open and competitive encounter with goals likely at both ends.`);
  } else {
    lines.push(`Neither side has been especially convincing in recent outings, and this could be a cautious, tight affair.`);
  }

  // Pick justification
  if (pick === "1") {
    lines.push(`Home advantage combined with the odds movement and form data points toward a ${home} win.`);
  } else if (pick === "2") {
    lines.push(`Despite playing away, ${away}'s form and the odds strongly suggest they can take all three points.`);
  } else if (pick === "X") {
    lines.push(`Given the balanced odds and form, a share of the spoils looks the most likely outcome.`);
  } else if (pick === "1X") {
    lines.push(`${home} are unlikely to lose here — a win or draw for the hosts looks the value play.`);
  } else if (pick === "X2") {
    lines.push(`${away} look difficult to beat in this one — backing them not to lose covers the most likely outcomes.`);
  } else if (pick === "O") {
    lines.push(`With both teams in attacking form and open odds, this looks like a game that will produce goals.`);
  } else if (pick === "U") {
    lines.push(`Expect a tight, well-organised game — under 2.5 goals looks the safer play given the defensive records.`);
  }

  return lines.join(" ");
}

module.exports = { pickResult, pickGoals, generateAnalysis, formScore };
