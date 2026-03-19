// routes/appointmentRoutes.js
const express = require("express");
const router = express.Router();
const {
  getAvailableSlots,
  createAppointment,
  getCancelPage,
  cancelAppointment,
} = require("../controllers/appointmentController");

// GET available slots for a date
router.get("/slots", getAvailableSlots);

// POST create new appointment
router.post("/appointments", createAppointment);

// GET cancel confirmation page (HTML)
router.get("/cancel/:token", getCancelPage);

// DELETE cancel (delete) appointment
router.delete("/cancel/:token", cancelAppointment);

module.exports = router;
