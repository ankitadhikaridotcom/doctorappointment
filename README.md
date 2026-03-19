# 🏥 Dr. Ankit – Doctor Appointment Booking System

A complete full-stack web application for booking medical appointments with email confirmation, time slot availability, and cancellation support.

---

## 📁 Folder Structure

```
doctor-booking/
├── backend/
│   ├── controllers/
│   │   └── appointmentController.js   # Business logic for all routes
│   ├── models/
│   │   └── Appointment.js             # MongoDB schema
│   ├── routes/
│   │   └── appointmentRoutes.js       # Express route definitions
│   ├── utils/
│   │   └── mailer.js                  # Nodemailer email templates
│   ├── server.js                      # Express app entry point
│   ├── package.json
│   └── .env                           # ⚠️ Configure this before running
│
└── frontend/
    ├── css/
    │   └── style.css                  # Full responsive stylesheet
    ├── js/
    │   └── main.js                    # Navbar, slots, form logic
    └── index.html                     # Single-page app (4 sections)
```

---

## ⚙️ Setup Instructions

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB](https://www.mongodb.com/try/download/community) running locally, **or** a [MongoDB Atlas](https://www.mongodb.com/atlas) connection string
- A Gmail account (or any SMTP provider) for sending emails

### 2. Install Dependencies
```bash
cd doctor-booking/backend
npm install
```

### 3. Configure Environment Variables
Edit `backend/.env` with your actual credentials:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/doctor_appointments

# Gmail SMTP (recommended)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_char_app_password   # See note below

# Doctor's notification email
DOCTOR_EMAIL=doctor_notification@example.com

# Base URL for cancel links
BASE_URL=http://localhost:3000
```

> **Gmail App Password**: Go to Google Account → Security → 2-Step Verification → App Passwords → Generate one for "Mail". Use that 16-character password as `EMAIL_PASS`. Do NOT use your regular Gmail password.

### 4. Start MongoDB (local)
```bash
# macOS (Homebrew)
brew services start mongodb-community

# Ubuntu/Debian
sudo systemctl start mongod

# Windows
net start MongoDB
```

### 5. Run the Server
```bash
cd backend
node server.js
# or for auto-restart during development:
npx nodemon server.js
```

### 6. Open the App
Visit **http://localhost:3000** in your browser.

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/slots?date=YYYY-MM-DD` | Fetch available time slots for a date |
| `POST` | `/appointments` | Book a new appointment |
| `GET` | `/cancel/:token` | Show cancellation confirmation page |
| `DELETE` | `/cancel/:token` | Cancel (soft-delete) the appointment |

### POST /appointments – Request Body
```json
{
  "name": "Rahul Sharma",
  "email": "rahul@example.com",
  "phone": "9876543210",
  "date": "2024-12-20",
  "timeSlot": "11:00 AM",
  "concern": "General Checkup",
  "message": "Experiencing mild fever for 2 days"
}
```

### GET /slots – Response
```json
{
  "success": true,
  "date": "2024-12-20",
  "availableSlots": ["10:00 AM", "12:00 PM", "3:00 PM"],
  "bookedSlots": ["11:00 AM", "2:00 PM", "4:00 PM"]
}
```

---

## ✉️ Email System

Three automated emails are sent:

1. **Patient Confirmation** – Sent after successful booking, includes appointment details and a **cancel link**.
2. **Doctor Notification** – Sent to `DOCTOR_EMAIL` with the patient's full details.
3. **Cancellation Confirmation** – Sent to the patient when they cancel via the cancel link.

---

## 🔒 Cancellation Flow

1. Each appointment is assigned a UUID token on creation.
2. The cancel link (`http://localhost:3000/cancel/<token>`) is included in the patient's confirmation email.
3. Visiting the link shows a styled HTML page with appointment details and Yes/No buttons.
4. Clicking **Yes** sends a `DELETE /cancel/:token` request, soft-deletes the record, and sends a cancellation email.

---

## 🗄️ MongoDB Schema

```js
{
  name:     String,   // required
  email:    String,   // required, validated
  phone:    String,   // required, 10-digit Indian number
  date:     String,   // "YYYY-MM-DD"
  timeSlot: String,   // enum of 6 predefined slots
  concern:  String,   // enum: General Checkup | Consultation | Emergency | Follow-up | Other
  message:  String,   // optional
  token:    String,   // UUID, unique — used for cancellation
  status:   String,   // "booked" | "cancelled"
  createdAt, updatedAt  // auto timestamps
}
```

A **compound unique index** on `{ date, timeSlot }` prevents double-booking at the database level.

---

## 🚀 Production Deployment Notes

- Set `BASE_URL` in `.env` to your production domain (e.g. `https://drankit.in`)
- Use `MONGODB_URI` from MongoDB Atlas for cloud database
- Use a process manager like `pm2` to keep the server running: `pm2 start server.js`
- Serve behind Nginx for SSL/HTTPS support
- Never commit `.env` to version control — add it to `.gitignore`
