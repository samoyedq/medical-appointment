import axios from "axios";

const image = {
    logo: "https://molino-backend.onrender.com/images/Molino-Polyclinic-Logo.png",
    // logo: "http://localhost:8000/images/Molino-Polyclinic-Logo.png",
    
};

const isProduction = window.location.hostname !== 'localhost';

const ip = {
  address: isProduction 
    ? 'https://molino-backend.onrender.com'  // Your deployed backend URL
    : 'http://localhost:8000'                // Local development URL
};

axios.defaults.baseURL = ip.address;
axios.defaults.withCredentials = true;



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


