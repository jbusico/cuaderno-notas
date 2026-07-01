const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const apiKey = process.env.API_KEY;
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";

let clientPromise = null;
function getCollection() {
  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }
  return clientPromise.then((client) =>
    client.db("cuaderno_notas").collection("estado")
  );
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (!apiKey || req.headers["x-api-key"] !== apiKey) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const col = await getCollection();

    if (req.method === "GET") {
      const doc = await col.findOne({ _id: "main" });
      res.status(200).json(
        doc ? { data: doc.data, updatedAt: doc.updatedAt } : { data: null, updatedAt: null }
      );
      return;
    }

    if (req.method === "PUT") {
      const body = req.body;
      if (!body || typeof body.data === "undefined") {
        res.status(400).json({ error: "falta 'data' en el body" });
        return;
      }
      const updatedAt = new Date().toISOString();
      await col.updateOne(
        { _id: "main" },
        { $set: { data: body.data, updatedAt } },
        { upsert: true }
      );
      res.status(200).json({ ok: true, updatedAt });
      return;
    }

    res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    res.status(500).json({ error: "error de servidor", detail: String(e && e.message || e) });
  }
};
