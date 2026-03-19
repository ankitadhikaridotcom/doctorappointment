// server.js – Main Express Application
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const appointmentRoutes = require("./routes/appointmentRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from the /frontend directory
app.use(express.static(path.join(__dirname, "frontend")));

// ─── API Routes ────────────────────────────────────────────────
app.use("/", appointmentRoutes);

// ─── Fallback: Serve index.html for all unmatched GET routes ──
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/index.html"));
});

// ─── MongoDB Connection ────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });
