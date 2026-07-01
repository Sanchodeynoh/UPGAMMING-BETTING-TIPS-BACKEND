// db.js
//
// Two storage modes:
//
// 1. MongoDB (recommended, persists permanently) — used automatically if
//    the MONGODB_URI environment variable is set on Render.
//
// 2. Local JSON file fallback (data/db.json) — used if MONGODB_URI is not
//    set. This works fine for local development, but on Render's free
//    tier the filesystem resets every time the service cold-starts after
//    being idle, which wipes anything the admin dashboard added. If your
//    admin-added matches keep disappearing, this is why — set up
//    MONGODB_URI (see README) to fix it permanently.

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "data", "db.json");
const MONGODB_URI = process.env.MONGODB_URI;

let mongoClient = null;
let mongoCollection = null;

async function getMongoCollection() {
  if (mongoCollection) return mongoCollection;
  const { MongoClient } = require("mongodb");
  mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  const db = mongoClient.db("upgamming");
  mongoCollection = db.collection("site_data");
  return mongoCollection;
}

function readFileDB() {
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeFileDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

async function readDB() {
  if (MONGODB_URI) {
    const col = await getMongoCollection();
    let doc = await col.findOne({ _id: "main" });
    if (!doc) {
      // First run with Mongo: seed it from the local JSON file once.
      const seed = readFileDB();
      await col.insertOne({ _id: "main", ...seed });
      return seed;
    }
    delete doc._id;
    return doc;
  }
  return readFileDB();
}

async function writeDB(data) {
  if (MONGODB_URI) {
    const col = await getMongoCollection();
    await col.updateOne({ _id: "main" }, { $set: data }, { upsert: true });
    return;
  }
  writeFileDB(data);
}

module.exports = { readDB, writeDB };
