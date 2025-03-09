import axios from "axios";

// Detect environment
const isProduction = window.location.hostname !== 'localhost';

// Base URLs for API and assets
const ip = {
  address: isProduction 
    ? 'https://molino-backend.onrender.com'  // Your deployed backend URL
    : 'http://localhost:8000',               // Local development URL
  
  // Add an images property to standardize all image paths
  images: function(path) {
    const baseUrl = isProduction 
      ? 'https://molino-backend.onrender.com/images' 
      : 'http://localhost:8000/images';
    
    return `${baseUrl}/${path}`;
  }
};

// Configure axios defaults
axios.defaults.baseURL = ip.address;
axios.defaults.withCredentials = true;

// Update image references to use the function
const image = {
  logo: ip.images('Molino-Polyclinic-Logo.png'),
  landingPage: ip.images('Landing-Page.png'),
  // Add any other common images here
};

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