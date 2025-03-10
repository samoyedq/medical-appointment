import axios from "axios";
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';
const image = {
  logo: isLocalhost 
      ? "http://localhost:8000/images/Molino-Polyclinic-Logo.png"
      : "https://molino-backend.onrender.com/images/Molino-Polyclinic-Logo.png"
};

const ip = {
  address: isLocalhost
      ? 'http://localhost:8000'
      : 'https://molino-backend.onrender.com'
};

// Configure axios defaults
axios.defaults.baseURL = ip.address;
axios.defaults.withCredentials = true;

// Configure axios with proper security settings for HTTPS
if (!isLocalhost) {
  // Increase timeout for potentially slower free-tier server responses
  axios.defaults.timeout = 30000; 
  
  // Set secure cookie attribute for HTTPS (handled by the backend)
  // This is just an informational comment as HTTP-only cookies are set by the server
}

const specialties = [
    "Neurology",
    "Cardiology",
    "Endocrinology",
    "Dermatology",
    "Hematology",
    "Urology",
    "Gastroenterology",
    "Pediatric Cardiology",
    "Pediatric Surgery",
    "Pulmonology",
    "Orthopedic Surgery",
    "General Surgery",
    "Infectiology",
    "Opthalmology",
    "Pediatrics",
    "Internal Medicine",
    "Family Medicine",
    "General Medicine"
];
export {
    image,
    specialties,
    ip
}


