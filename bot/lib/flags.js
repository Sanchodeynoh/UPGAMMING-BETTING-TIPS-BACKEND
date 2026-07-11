// flags.js — maps API-Football country names to flag emojis
const FLAGS = {
  "World": "🌍", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "France": "🇫🇷", "Germany": "🇩🇪",
  "Spain": "🇪🇸", "Italy": "🇮🇹", "Portugal": "🇵🇹", "Netherlands": "🇳🇱",
  "Belgium": "🇧🇪", "Brazil": "🇧🇷", "Argentina": "🇦🇷", "Mexico": "🇲🇽",
  "USA": "🇺🇸", "Japan": "🇯🇵", "South Korea": "🇰🇷", "China": "🇨🇳",
  "Australia": "🇦🇺", "Turkey": "🇹🇷", "Greece": "🇬🇷", "Russia": "🇷🇺",
  "Ukraine": "🇺🇦", "Poland": "🇵🇱", "Switzerland": "🇨🇭", "Austria": "🇦🇹",
  "Sweden": "🇸🇪", "Norway": "🇳🇴", "Denmark": "🇩🇰", "Finland": "🇫🇮",
  "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Wales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿", "Ireland": "🇮🇪", "Croatia": "🇭🇷",
  "Serbia": "🇷🇸", "Romania": "🇷🇴", "Czech-Republic": "🇨🇿", "Slovakia": "🇸🇰",
  "Hungary": "🇭🇺", "Bulgaria": "🇧🇬", "Albania": "🇦🇱", "Slovenia": "🇸🇮",
  "Israel": "🇮🇱", "Saudi-Arabia": "🇸🇦", "UAE": "🇦🇪", "Qatar": "🇶🇦",
  "Iran": "🇮🇷", "Iraq": "🇮🇶", "India": "🇮🇳", "Thailand": "🇹🇭",
  "Indonesia": "🇮🇩", "Vietnam": "🇻🇳", "Malaysia": "🇲🇾", "Singapore": "🇸🇬",
  "Nigeria": "🇳🇬", "Ghana": "🇬🇭", "Kenya": "🇰🇪", "South-Africa": "🇿🇦",
  "Egypt": "🇪🇬", "Morocco": "🇲🇦", "Tunisia": "🇹🇳", "Algeria": "🇩🇿",
  "Senegal": "🇸🇳", "Ivory-Coast": "🇨🇮", "Cameroon": "🇨🇲", "Tanzania": "🇹🇿",
  "Uganda": "🇺🇬", "Ethiopia": "🇪🇹", "Zambia": "🇿🇲", "Zimbabwe": "🇿🇼",
  "Colombia": "🇨🇴", "Chile": "🇨🇱", "Uruguay": "🇺🇾", "Ecuador": "🇪🇨",
  "Peru": "🇵🇪", "Venezuela": "🇻🇪", "Bolivia": "🇧🇴", "Paraguay": "🇵🇾",
  "Costa-Rica": "🇨🇷", "Panama": "🇵🇦", "Honduras": "🇭🇳", "Guatemala": "🇬🇹",
  "Canada": "🇨🇦", "New-Zealand": "🇳🇿", "Jamaica": "🇯🇲",
  "Europe": "🇪🇺", "Africa": "🌍", "Asia": "🌏", "CONCACAF": "🌎",
  "South-America": "🌎"
};

function getFlag(country) {
  if (!country) return "⚽";
  const clean = country.replace(/\s+/g, "-");
  return FLAGS[clean] || FLAGS[country] || "⚽";
}

module.exports = { getFlag };
