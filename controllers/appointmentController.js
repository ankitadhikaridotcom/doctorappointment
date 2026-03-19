// controllers/appointmentController.js
const Appointment = require("../models/Appointment");
const { v4: uuidv4 } = require("uuid");
const {
  sendPatientConfirmation,
  sendDoctorNotification,
  sendCancellationConfirmation,
} = require("../utils/mailer");

const ALL_SLOTS = ["10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

/**
 * GET /slots?date=YYYY-MM-DD
 * Returns available (unbooked) time slots for a given date
 */
const getAvailableSlots = async (req, res) => {
  const { date } = req.query;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, message: "Invalid or missing date. Use YYYY-MM-DD format." });
  }

  // Prevent booking past dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(date + "T00:00:00");
  if (selected < today) {
    return res.status(400).json({ success: false, message: "Cannot book appointments for past dates." });
  }

  try {
    const bookedAppointments = await Appointment.find({ date, status: "booked" }).select("timeSlot");
    const bookedSlots = bookedAppointments.map((a) => a.timeSlot);
    const availableSlots = ALL_SLOTS.filter((slot) => !bookedSlots.includes(slot));
    res.json({ success: true, date, availableSlots, bookedSlots });
  } catch (err) {
    console.error("Error fetching slots:", err);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
};

/**
 * POST /appointments
 * Books a new appointment
 */
const createAppointment = async (req, res) => {
  const { name, email, phone, date, timeSlot, concern, message } = req.body;

  // --- Validation ---
  if (!name || !email || !phone || !date || !timeSlot || !concern) {
    return res.status(400).json({ success: false, message: "All required fields must be filled." });
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Invalid email address." });
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ success: false, message: "Invalid mobile number. Must be a 10-digit Indian number starting with 6-9." });
  }

  if (!ALL_SLOTS.includes(timeSlot)) {
    return res.status(400).json({ success: false, message: "Invalid time slot selected." });
  }

  // Prevent past date bookings
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(date + "T00:00:00");
  if (selected < today) {
    return res.status(400).json({ success: false, message: "Cannot book appointments for past dates." });
  }

  try {
    // Double-booking prevention
    const existing = await Appointment.findOne({ date, timeSlot, status: "booked" });
    if (existing) {
      return res.status(409).json({ success: false, message: "This time slot is already booked. Please choose another slot." });
    }

    const token = uuidv4();

    const appointment = new Appointment({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      date,
      timeSlot,
      concern,
      message: message ? message.trim() : "",
      token,
    });

    await appointment.save();

    // Send emails (non-blocking — log errors but don't fail the request)
    Promise.allSettled([
      sendPatientConfirmation(appointment),
      sendDoctorNotification(appointment),
    ]).then((results) => {
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(`Email ${i === 0 ? "to patient" : "to doctor"} failed:`, r.reason.message);
        }
      });
    });

    res.status(201).json({
      success: true,
      message: "Appointment booked successfully! A confirmation email has been sent to you.",
      appointmentId: appointment._id,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "This time slot was just taken. Please select another." });
    }
    console.error("Error creating appointment:", err);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
};

/**
 * GET /cancel/:token
 * Serves the cancellation confirmation HTML page
 */
const getCancelPage = async (req, res) => {
  const { token } = req.params;

  try {
    const appointment = await Appointment.findOne({ token, status: "booked" });

    if (!appointment) {
      return res.status(404).send(buildErrorPage("Appointment Not Found", "This cancellation link is invalid or the appointment has already been cancelled."));
    }

    res.send(buildCancelPage(appointment));
  } catch (err) {
    console.error("Error fetching appointment for cancel:", err);
    res.status(500).send(buildErrorPage("Server Error", "Something went wrong. Please try again."));
  }
};

/**
 * DELETE /cancel/:token
 * Cancels (deletes) the appointment
 */
const cancelAppointment = async (req, res) => {
  const { token } = req.params;

  try {
    const appointment = await Appointment.findOne({ token, status: "booked" });

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found or already cancelled." });
    }

    // Soft delete by updating status
    appointment.status = "cancelled";
    await appointment.save();

    // Notify patient of cancellation
    sendCancellationConfirmation(appointment).catch((err) =>
      console.error("Cancellation email failed:", err.message)
    );

    res.json({ success: true, message: "Your appointment has been successfully cancelled." });
  } catch (err) {
    console.error("Error cancelling appointment:", err);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
};

// --- Helper: Build cancel confirmation HTML page ---
const buildCancelPage = (appointment) => {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Cancel Appointment – Dr. Ankit's Clinic</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'DM Sans', sans-serif;
      background: linear-gradient(135deg, #fff5f5 0%, #ffeaea 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #fff;
      border-radius: 20px;
      padding: 50px 40px;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.10);
      text-align: center;
      animation: slideUp 0.4s ease;
    }
    @keyframes slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
    .icon { font-size: 64px; margin-bottom: 20px; }
    h1 { font-family: 'DM Serif Display', serif; font-size: 28px; color: #1a1a2e; margin-bottom: 10px; }
    .subtitle { color: #888; font-size: 15px; margin-bottom: 30px; line-height: 1.5; }
    .details {
      background: #fff8f8;
      border: 1px solid #fdd;
      border-radius: 12px;
      padding: 20px 25px;
      margin-bottom: 30px;
      text-align: left;
    }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fce; font-size: 14px; }
    .detail-row:last-child { border-bottom: none; }
    .label { color: #888; }
    .value { font-weight: 600; color: #222; }
    .btn-group { display: flex; gap: 15px; justify-content: center; }
    .btn {
      padding: 14px 32px;
      border-radius: 50px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      font-family: 'DM Sans', sans-serif;
    }
    .btn-yes { background: #e74c3c; color: #fff; }
    .btn-yes:hover { background: #c0392b; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(231,76,60,0.3); }
    .btn-no { background: #f0f0f0; color: #333; }
    .btn-no:hover { background: #e0e0e0; transform: translateY(-2px); }
    #result { display:none; }
    #result.success { color: #27ae60; font-size: 16px; margin-top: 20px; font-weight: 600; }
    #result.error { color: #e74c3c; font-size: 15px; margin-top: 20px; }
    .spinner { display: none; width: 22px; height: 22px; border: 3px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card" id="card">
    <div class="icon">🗓️</div>
    <h1>Cancel Appointment?</h1>
    <p class="subtitle">You are about to cancel the following appointment. This action cannot be undone.</p>
    <div class="details">
      <div class="detail-row"><span class="label">Patient</span><span class="value">${appointment.name}</span></div>
      <div class="detail-row"><span class="label">Date</span><span class="value">${formatDate(appointment.date)}</span></div>
      <div class="detail-row"><span class="label">Time Slot</span><span class="value">${appointment.timeSlot}</span></div>
      <div class="detail-row"><span class="label">Concern</span><span class="value">${appointment.concern}</span></div>
    </div>
    <div class="btn-group" id="btnGroup">
      <button class="btn btn-no" onclick="window.location.href='/'">No, Keep It</button>
      <button class="btn btn-yes" id="confirmBtn" onclick="confirmCancel()">
        <span id="btnText">Yes, Cancel</span>
        <div class="spinner" id="spinner"></div>
      </button>
    </div>
    <div id="result"></div>
  </div>

  <script>
    async function confirmCancel() {
      const btn = document.getElementById('confirmBtn');
      const btnText = document.getElementById('btnText');
      const spinner = document.getElementById('spinner');
      const result = document.getElementById('result');
      const btnGroup = document.getElementById('btnGroup');

      btn.disabled = true;
      btnText.style.display = 'none';
      spinner.style.display = 'block';

      try {
        const res = await fetch('/cancel/${appointment.token}', { method: 'DELETE' });
        const data = await res.json();

        btnGroup.style.display = 'none';
        result.style.display = 'block';

        if (data.success) {
          document.querySelector('.icon').textContent = '✅';
          document.querySelector('h1').textContent = 'Appointment Cancelled';
          document.querySelector('.subtitle').textContent = 'Your appointment has been cancelled successfully. A confirmation email has been sent to you.';
          document.querySelector('.details').style.display = 'none';
        } else {
          result.className = 'error';
          result.textContent = data.message || 'Something went wrong. Please try again.';
          btnGroup.style.display = 'flex';
          btn.disabled = false;
          btnText.style.display = 'inline';
          spinner.style.display = 'none';
        }
      } catch (err) {
        result.style.display = 'block';
        result.className = 'error';
        result.textContent = 'Network error. Please try again.';
        btnGroup.style.display = 'flex';
        btn.disabled = false;
        btnText.style.display = 'inline';
        spinner.style.display = 'none';
      }
    }
  </script>
</body>
</html>
  `;
};

const buildErrorPage = (title, message) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title} – Dr. Ankit's Clinic</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
  <style>
    body { font-family:'DM Sans',sans-serif; background:#f4f7f9; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:20px; }
    .card { background:#fff; border-radius:20px; padding:50px 40px; max-width:480px; width:100%; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.08); }
    .icon { font-size:60px; margin-bottom:20px; }
    h1 { font-family:'DM Serif Display',serif; font-size:26px; color:#1a1a2e; margin-bottom:12px; }
    p { color:#777; font-size:15px; line-height:1.6; margin-bottom:25px; }
    a { display:inline-block; background:#1a6b4a; color:#fff; text-decoration:none; padding:12px 28px; border-radius:50px; font-weight:600; font-size:15px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠️</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/">Go to Homepage</a>
  </div>
</body>
</html>
`;

module.exports = { getAvailableSlots, createAppointment, getCancelPage, cancelAppointment };
