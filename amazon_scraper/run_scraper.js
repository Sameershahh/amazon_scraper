// run_scraper.js
const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// Folder structure
// run_scraper.js is inside amazon_scraper/
// scraper.py is one folder above
const PARENT_DIR = path.join(__dirname, "..");
const DATA_PATH = path.join(PARENT_DIR, "data", "prices.csv");

// POST /run-scraper
app.post("/run-scraper", (req, res) => {
  const { keyword = "", headless = true, max_items = 0 } = req.body;
  const pythonCmd = process.env.PYTHON || "python";

  // args for scraper.py
  const args = ["scraper.py", "--mode", "search"];
  if (keyword) args.push("--keyword", keyword);
  if (headless) args.push("--headless");
  if (max_items) args.push("--max_items", String(max_items));

  console.log("Running:", pythonCmd, args.join(" "));
  const py = spawn(pythonCmd, args, { cwd: PARENT_DIR }); // ✅ run from parent dir

  let out = "";
  let err = "";

  py.stdout.on("data", (chunk) => {
    const s = chunk.toString();
    process.stdout.write(s);
    out += s;
  });

  py.stderr.on("data", (chunk) => {
    const s = chunk.toString();
    process.stderr.write(s);
    err += s;
  });

  py.on("close", (code) => {
    if (code === 0) {
      res.json({ success: true, message: "Scraper finished", output: out });
    } else {
      res.status(500).json({ success: false, code, error: err || out });
    }
  });
});

// GET /prices
app.get("/prices", (req, res) => {
  if (!fs.existsSync(DATA_PATH)) return res.json([]);
  const csv = fs.readFileSync(DATA_PATH, "utf8").trim();
  if (!csv) return res.json([]);

  const lines = csv.split(/\r?\n/);
  const headers = lines.shift().split(",");
  const rows = lines.map((line) => {
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h, i) => (obj[h.trim()] = (cols[i] || "").trim()));
    return obj;
  });
  res.json(rows);
});

const PORT = 5000;
app.listen(PORT, () =>
  console.log(`✅ Bridge running on http://localhost:${PORT}`)
);
