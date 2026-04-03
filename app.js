// Frontend demo server (no backend logic)
// TODO: connect real backend later

const express = require("express");
const path = require("path");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

// Mock data (frontend only)
const demoUser = { name: "Demo User" };

const demoStats = {
  avg: 28,
  totalLogs: 5,
  dayOfCycle: 12,
  nextPeriod: new Date(),
  min: 26,
  max: 30,
  variance: 4,
  isIrregular: false,
  phase: {
    name: "Follicular",
    emoji: "🌱",
    hormones: "Estrogen rising",
    tip: "Great time to start new things!"
  }
};

const demoLogs = [
  {
    periodStartDate: new Date(),
    flowLevel: "medium",
    mood: "good",
    hasClots: false
  }
];

// Routes (frontend only)
app.get("/", (req, res) => {
  res.render("landing");
});

app.get("/dashboard", (req, res) => {
  res.render("dashboard", {
    user: demoUser,
    stats: demoStats,
    logs: demoLogs
  });
});

app.listen(3000, () => console.log("Frontend demo running on http://localhost:3000"));