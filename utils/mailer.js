// utils/mailer.js
const nodemailer = require("nodemailer");
require("dotenv").config();

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send appointment confirmation email to patient
 */
const sendPatientConfirmation = async (appointment) => {
  const cancelLink = `${process.env.BASE_URL}/cancel/${appointment.token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7f9; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1a6b4a, #2d9e6e); padding: 40px 30px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 26px; letter-spacing: 1px; }
        .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
        .body { padding: 35px 30px; }
        .greeting { font-size: 18px; color: #1a1a2e; margin-bottom: 10px; }
        .intro { color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 25px; }
        .card { background: #f0faf5; border-left: 4px solid #2d9e6e; border-radius: 8px; padding: 20px 25px; margin-bottom: 25px; }
        .card h3 { margin: 0 0 15px; color: #1a6b4a; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #d4edda; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #666; font-size: 14px; }
        .detail-value { color: #222; font-weight: 600; font-size: 14px; }
        .cancel-section { background: #fff8f0; border: 1px solid #f5c6a0; border-radius: 8px; padding: 20px 25px; margin-bottom: 25px; }
        .cancel-section h4 { margin: 0 0 10px; color: #c0392b; font-size: 14px; }
        .cancel-section p { color: #666; font-size: 13px; margin: 0 0 15px; }
        .btn-cancel { display: inline-block; background: #e74c3c; color: #fff !important; text-decoration: none; padding: 10px 22px; border-radius: 6px; font-size: 14px; font-weight: 600; }
        .footer { background: #f9f9f9; text-align: center; padding: 20px 30px; color: #999; font-size: 12px; border-top: 1px solid #eee; }
        .clinic-name { color: #2d9e6e; font-weight: 700; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Appointment Confirmed</h1>
          <p>Dr. Ankit's Medical Clinic</p>
        </div>
        <div class="body">
          <div class="greeting">Dear ${appointment.name},</div>
          <p class="intro">Your appointment has been successfully booked. Please find your appointment details below. Arrive 10 minutes early and carry any previous prescriptions or reports if applicable.</p>
          
          <div class="card">
            <h3>📋 Appointment Details</h3>
            <div class="detail-row"><span class="detail-label">Patient Name</span><span class="detail-value">${appointment.name}</span></div>
            <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${appointment.email}</span></div>
            <div class="detail-row"><span class="detail-label">Mobile</span><span class="detail-value">${appointment.phone}</span></div>
            <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${formatDate(appointment.date)}</span></div>
            <div class="detail-row"><span class="detail-label">Time Slot</span><span class="detail-value">${appointment.timeSlot}</span></div>
            <div class="detail-row"><span class="detail-label">Concern</span><span class="detail-value">${appointment.concern}</span></div>
            ${appointment.message ? `<div class="detail-row"><span class="detail-label">Message</span><span class="detail-value">${appointment.message}</span></div>` : ""}
          </div>

          <div class="cancel-section">
            <h4>🚫 Need to Cancel?</h4>
            <p>If you need to cancel your appointment, please do so at least 2 hours in advance using the link below.</p>
            <a href="${cancelLink}" class="btn-cancel">Cancel Appointment</a>
          </div>

          <p style="color:#888;font-size:13px;">For urgent assistance, please call the clinic directly. Do not reply to this email.</p>
        </div>
        <div class="footer">
          <p>© 2024 <span class="clinic-name">Dr. Ankit's Medical Clinic</span> · All rights reserved</p>
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Dr. Ankit's Clinic" <${process.env.EMAIL_USER}>`,
    to: appointment.email,
    subject: `Appointment Confirmed – ${formatDate(appointment.date)} at ${appointment.timeSlot}`,
    html,
  });
};

/**
 * Send new booking notification to doctor
 */
const sendDoctorNotification = async (appointment) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7f9; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1a3a5c, #2980b9); padding: 35px 30px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 24px; }
        .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
        .body { padding: 30px; }
        .card { background: #eaf4ff; border-left: 4px solid #2980b9; border-radius: 8px; padding: 20px 25px; margin-bottom: 20px; }
        .card h3 { margin: 0 0 15px; color: #1a3a5c; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #c8dff5; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #555; font-size: 14px; }
        .detail-value { color: #111; font-weight: 600; font-size: 14px; }
        .footer { background: #f9f9f9; text-align: center; padding: 18px 30px; color: #aaa; font-size: 12px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🗓 New Appointment Booked</h1>
          <p>A patient has scheduled an appointment with you.</p>
        </div>
        <div class="body">
          <div class="card">
            <h3>Patient Information</h3>
            <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${appointment.name}</span></div>
            <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${appointment.email}</span></div>
            <div class="detail-row"><span class="detail-label">Mobile</span><span class="detail-value">${appointment.phone}</span></div>
            <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${formatDate(appointment.date)}</span></div>
            <div class="detail-row"><span class="detail-label">Time Slot</span><span class="detail-value">${appointment.timeSlot}</span></div>
            <div class="detail-row"><span class="detail-label">Concern</span><span class="detail-value">${appointment.concern}</span></div>
            ${appointment.message ? `<div class="detail-row"><span class="detail-label">Patient Note</span><span class="detail-value">${appointment.message}</span></div>` : ""}
          </div>
          <p style="color:#777;font-size:13px;">Log in to the admin panel to manage appointments.</p>
        </div>
        <div class="footer">
          <p>© 2024 Dr. Ankit's Clinic Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Clinic Booking System" <${process.env.EMAIL_USER}>`,
    to: process.env.DOCTOR_EMAIL,
    subject: `[New Appointment] ${appointment.name} – ${formatDate(appointment.date)} at ${appointment.timeSlot}`,
    html,
  });
};

/**
 * Send cancellation confirmation to patient
 */
const sendCancellationConfirmation = async (appointment) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7f9; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #7f1c1c, #c0392b); padding: 35px 30px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 24px; }
        .body { padding: 30px; color: #444; font-size: 15px; line-height: 1.6; }
        .footer { background: #f9f9f9; text-align: center; padding: 18px 30px; color: #aaa; font-size: 12px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>❌ Appointment Cancelled</h1></div>
        <div class="body">
          <p>Dear ${appointment.name},</p>
          <p>Your appointment scheduled for <strong>${formatDate(appointment.date)}</strong> at <strong>${appointment.timeSlot}</strong> has been successfully cancelled.</p>
          <p>If you'd like to reschedule, please visit our website and book a new appointment at your convenience.</p>
          <p>We hope to see you soon. Take care of your health!</p>
        </div>
        <div class="footer"><p>© 2024 Dr. Ankit's Medical Clinic</p></div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Dr. Ankit's Clinic" <${process.env.EMAIL_USER}>`,
    to: appointment.email,
    subject: `Appointment Cancelled – ${formatDate(appointment.date)}`,
    html,
  });
};

// Helper: format "YYYY-MM-DD" → "Monday, 15 January 2024"
const formatDate = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
};

module.exports = { sendPatientConfirmation, sendDoctorNotification, sendCancellationConfirmation };
