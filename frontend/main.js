// frontend/js/main.js – Main application logic

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initScrollReveal();
  initAppointmentForm();
});

/* ═══════════════════════════════════════════════
   NAVBAR
═══════════════════════════════════════════════ */
function initNavbar() {
  const navbar = document.querySelector(".navbar");
  const toggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  const links = document.querySelectorAll(".nav-links a[href^='#']");

  // Scroll shadow
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 20);
    updateActiveLink();
  });

  // Mobile toggle
  toggle?.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });

  // Close on link click
  navLinks?.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => navLinks.classList.remove("open"));
  });

  function updateActiveLink() {
    const sections = ["home", "about", "appointment", "contact"];
    let current = "home";
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el && window.scrollY >= el.offsetTop - 120) current = id;
    });
    links.forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === `#${current}`);
    });
  }
  updateActiveLink();
}

/* ═══════════════════════════════════════════════
   SCROLL REVEAL
═══════════════════════════════════════════════ */
function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
    { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
}

/* ═══════════════════════════════════════════════
   APPOINTMENT FORM
═══════════════════════════════════════════════ */
function initAppointmentForm() {
  const form = document.getElementById("appointmentForm");
  const dateInput = document.getElementById("apptDate");
  const slotLoader = document.getElementById("slotLoader");
  const slotsGrid = document.getElementById("slotsGrid");
  const slotHidden = document.getElementById("slotHidden");
  const slotNoAvail = document.getElementById("slotNoAvail");
  const submitBtn = document.getElementById("submitBtn");
  const btnText = document.getElementById("btnText");
  const btnSpinner = document.getElementById("btnSpinner");
  const alertBox = document.getElementById("formAlert");

  // Set minimum date to today
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  dateInput.min = `${yyyy}-${mm}-${dd}`;

  // Fetch available slots when date changes
  dateInput.addEventListener("change", async () => {
    const date = dateInput.value;
    if (!date) return;

    // Reset slot UI
    slotsGrid.style.display = "none";
    slotsGrid.innerHTML = "";
    slotHidden.value = "";
    slotNoAvail && (slotNoAvail.style.display = "none");
    slotLoader.style.display = "flex";
    clearAlert();

    try {
      const res = await fetch(`/slots?date=${date}`);
      const data = await res.json();
      slotLoader.style.display = "none";

      if (!data.success) {
        showAlert("error", data.message || "Could not fetch available slots.");
        return;
      }

      if (data.availableSlots.length === 0) {
        if (slotNoAvail) slotNoAvail.style.display = "block";
        return;
      }

      // Render slot chips
      slotsGrid.style.display = "flex";
      data.availableSlots.forEach((slot) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "slot-chip";
        chip.textContent = slot;
        chip.addEventListener("click", () => {
          document.querySelectorAll(".slot-chip").forEach((c) => c.classList.remove("selected"));
          chip.classList.add("selected");
          slotHidden.value = slot;
        });
        slotsGrid.appendChild(chip);
      });
    } catch {
      slotLoader.style.display = "none";
      showAlert("error", "Network error while fetching time slots. Please try again.");
    }
  });

  // Form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAlert();

    // Validate
    const name = document.getElementById("apptName").value.trim();
    const email = document.getElementById("apptEmail").value.trim();
    const phone = document.getElementById("apptPhone").value.trim();
    const date = dateInput.value;
    const timeSlot = slotHidden.value;
    const concern = document.getElementById("apptConcern").value;
    const message = document.getElementById("apptMessage").value.trim();

    if (!name) return showAlert("error", "Please enter your full name.");
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return showAlert("error", "Please enter a valid email address.");
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) return showAlert("error", "Please enter a valid 10-digit Indian mobile number.");
    if (!date) return showAlert("error", "Please select an appointment date.");
    if (!timeSlot) return showAlert("error", "Please select an available time slot.");
    if (!concern) return showAlert("error", "Please select a concern type.");

    // Submit
    setLoading(true);
    try {
      const res = await fetch("/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, date, timeSlot, concern, message }),
      });
      const data = await res.json();

      setLoading(false);
      if (data.success) {
        showAlert("success", `✅ ${data.message}`);
        form.reset();
        slotsGrid.style.display = "none";
        slotsGrid.innerHTML = "";
        slotHidden.value = "";
        if (slotNoAvail) slotNoAvail.style.display = "none";
        // Scroll to the alert
        alertBox.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        showAlert("error", data.message || "Booking failed. Please try again.");
      }
    } catch {
      setLoading(false);
      showAlert("error", "Network error. Please check your connection and try again.");
    }
  });

  function setLoading(loading) {
    submitBtn.disabled = loading;
    btnText.style.display = loading ? "none" : "flex";
    btnSpinner.style.display = loading ? "block" : "none";
  }

  function showAlert(type, message) {
    alertBox.className = `alert alert-${type} show`;
    alertBox.innerHTML = `<span class="alert-icon">${type === "success" ? "✅" : "⚠️"}</span><span>${message}</span>`;
    alertBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function clearAlert() {
    alertBox.className = "alert";
    alertBox.innerHTML = "";
  }
}
