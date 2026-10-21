import express from "express";
import { readFile, writeFile } from "node:fs/promises";

const app = express();

app.use(express.json());

async function readDataFile(fileName) {
  const fileUrl = new URL(`../data/${fileName}`, import.meta.url);
  const contents = await readFile(fileUrl, "utf8");
  return JSON.parse(contents);
}

async function writeDataFile(fileName, data) {
  const fileUrl = new URL(`../data/${fileName}`, import.meta.url);
  await writeFile(fileUrl, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function parseDate(value) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/rooms", async (req, res) => {
  const rooms = await readDataFile("rooms.json");
  res.json(rooms);
});

app.get("/reservations", async (req, res) => {
  const reservations = await readDataFile("reservations.json");
  res.json(reservations);
});

app.get("/reservations/:id", async (req, res) => {
  const reservations = await readDataFile("reservations.json");
  const reservation = reservations.find(
    (item) => String(item.id) === req.params.id
  );

  if (!reservation) {
    return res.status(404).json({ error: "Pas de réservation" });
  }

  res.json(reservation);
});

function validateReservation(body) {
  const { roomId, reservedBy, start, end } = body ?? {};
  const errors = [];

  if (!Number.isSafeInteger(roomId)) errors.push("roomId doit être un entier");
  if (typeof reservedBy !== "string" || !reservedBy.trim()) errors.push("reservedBy requis");

  const startTs = parseDate(start);
  const endTs = parseDate(end);
  if (startTs == null || endTs == null) errors.push("Dates invalides (format ISO 8601)");
  else if (startTs >= endTs) errors.push("start doit être avant end");

  return { roomId, reservedBy: reservedBy?.trim(), startTs, endTs, errors };
}

function hasConflict(reservations, roomId, start, end) {
  return reservations.some(r =>
    r.status === "active" &&
    r.roomId === roomId &&
    Date.parse(r.start) < end &&
    start < Date.parse(r.end)
  );
}

function nextId(reservations) {
  const max = reservations.reduce((m, r) => Math.max(m, r.id ?? 0), 0);
  return max + 1;
}

app.post("/reservations", async (req, res) => {
  const { roomId, reservedBy, startTs, endTs, errors } = validateReservation(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(", ") });

  const [rooms, reservations] = await Promise.all([
    readDataFile("rooms.json"),
    readDataFile("reservations.json")
  ]);

  if (!rooms.some(r => r.id === roomId)) return res.status(404).json({ error: "Room non trouvée" });
  if (hasConflict(reservations, roomId, startTs, endTs)) {
    return res.status(409).json({ error: "La salle est déjà réservée pour cette période." });
  }

  const reservation = {
    id: nextId(reservations),
    roomId,
    reservedBy,
    start: new Date(startTs).toISOString(),
    end: new Date(endTs).toISOString(),
    status: "active"
  };

  reservations.push(reservation);
  await writeDataFile("reservations.json", reservations);
  res.status(201).json(reservation);
});

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});

export default app;