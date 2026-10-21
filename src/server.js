import express from "express";
import { readFile } from "node:fs/promises";

const app = express();

app.use(express.json());

async function readDataFile(fileName) {
  const fileUrl = new URL(`../data/${fileName}`, import.meta.url);
  const contents = await readFile(fileUrl, "utf8");
  return JSON.parse(contents);
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

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});

export default app;