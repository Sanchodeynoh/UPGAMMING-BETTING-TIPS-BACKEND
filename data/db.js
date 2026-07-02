// db.js
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
  console.log("Connected to MongoDB Atlas successfully");
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
    try {
      const col = await getMongoCollection();
      let doc = await col.findOne({ _id: "main" });
      if (!doc) {
        console.log("MongoDB empty — seeding from db.json");
        const seed = readFileDB();
        await col.insertOne({ _id: "main", ...seed });
        return seed;
      }
      delete doc._id;
      return doc;
    } catch (err) {
      console.error("MongoDB read error, falling back to file:", err.message);
      return readFileDB();
    }
  }
  console.log("No MONGODB_URI set — using local db.json file");
  return readFileDB();
}

async function writeDB(data) {
  if (MONGODB_URI) {
    try {
      const col = await getMongoCollection();
      await col.updateOne({ _id: "main" }, { $set: data }, { upsert: true });
      return;
    } catch (err) {
      console.error("MongoDB write error, falling back to file:", err.message);
      writeFileDB(data);
      return;
    }
  }
  writeFileDB(data);
}

module.exports = { readDB, writeDB };
