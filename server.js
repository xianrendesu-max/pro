import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

/* ===============================
   Static file hosting
================================ */
app.use(express.static(path.join(__dirname, "public")));

/* ===============================
   SPA fallback (important)
================================ */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ===============================
   Start server
================================ */
app.listen(PORT, () => {
  console.log(`Helios running on port ${PORT}`);
});
