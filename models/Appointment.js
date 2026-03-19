// models/Appointment.js
const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"],
    },
    date: {
      type: String, // stored as "YYYY-MM-DD"
      required: [true, "Appointment date is required"],
    },
    timeSlot: {
      type: String,
      required: [true, "Time slot is required"],
      enum: ["10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"],
    },
    concern: {
      type: String,
      required: [true, "Concern type is required"],
      enum: ["General Checkup", "Consultation", "Emergency", "Follow-up", "Other"],
    },
    message: {
      type: String,
      trim: true,
      default: "",
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["booked", "cancelled"],
      default: "booked",
    },
  },
  { timestamps: true }
);

// Compound index to enforce unique slot per date
appointmentSchema.index({ date: 1, timeSlot: 1 }, { unique: true });

module.exports = mongoose.model("Appointment", appointmentSchema);
