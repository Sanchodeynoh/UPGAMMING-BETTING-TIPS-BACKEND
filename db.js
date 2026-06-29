// db.js
// Simple file-backed data store. Reads/writes data/db.json on disk.
//
// IMPORTANT LIMITATION: Render's free tier filesystem is NOT permanently
// persistent across deploys/restarts in all cases. Edits made through the
// admin dashboard will survive while the service stays up, but a fresh
// deploy will reset data/db.json back to whatever is committed in git.
// For real production use, swap this out for a proper database
// (e.g. MongoDB Atlas free tier, or Render's own Postgres).

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "data", "db.json");

function readDB() {
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = { readDB, writeDB };
