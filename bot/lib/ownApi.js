// bot/lib/ownApi.js
const { API_BASE_URL, ADMIN_PASSWORD } = require("../config");

function assertConfigured() {
  if (!API_BASE_URL) throw new Error("API_BASE_URL is not set.");
  if (!ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD is not set.");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ADMIN_PASSWORD}`
  };
}

async function matchExists(id) {
  const res = await fetch(`${API_BASE_URL}/api/match/${id}`);
  return res.status === 200;
}

async function upsertMatch(match) {
  assertConfigured();
  const exists = await matchExists(match.id);

  const res = await fetch(
    `${API_BASE_URL}/api/admin/matches${exists ? "/" + match.id : ""}`,
    {
      method: exists ? "PUT" : "POST",
      headers: authHeaders(),
      body: JSON.stringify(match)
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`upsertMatch failed for ${match.id} (${res.status}): ${text}`);
  }
  return res.json();
}

async function getLiveMatches() {
  const res = await fetch(`${API_BASE_URL}/api/livescores`);
  if (!res.ok) throw new Error(`getLiveMatches failed (${res.status})`);
  const data = await res.json();
  return data.matches || [];
}

async function upsertLiveMatch(liveMatch) {
  assertConfigured();
  const current = await getLiveMatches();
  const exists = current.some((m) => m.id === liveMatch.id);

  const res = await fetch(
    `${API_BASE_URL}/api/admin/livescores${exists ? "/" + liveMatch.id : ""}`,
    {
      method: exists ? "PUT" : "POST",
      headers: authHeaders(),
      body: JSON.stringify(liveMatch)
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`upsertLiveMatch failed for ${liveMatch.id} (${res.status}): ${text}`);
  }
  return res.json();
}

module.exports = {
  matchExists,
  upsertMatch,
  getLiveMatches,
  upsertLiveMatch
};
