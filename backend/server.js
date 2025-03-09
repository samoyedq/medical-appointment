// server.js

const express = require('express');
const app = express();
const port = 8000;
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const http = require('http');
const server = http.createServer(app); // Use this server for Socket.IO
require('dotenv').config();
const MongoStore = require('connect-mongo');

const cors = require('cors');
app.use(
  cors({
    origin: `https://medical-appointment-mwuw.vercel.app`,
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
);

app.use(
  session({
    secret: 'session_secret_key',
    resave: false, 
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true, // Must be true for cross-origin cookies
      sameSite: 'none', // Must be 'none' for cross-origin cookies
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    },
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || 'mongodb+srv://mern:mern@cluster0.6mdyfjt.mongodb.net/PIMSdb',
      ttl: 30 * 24 * 60 * 60,
      autoRemove: 'native'
    })
  })
);


// Initialize Socket.IO
const socket = require('./socket'); // Import the socket module
socket.init(server); // Initialize Socket.IO with the server

// Import the scheduler after initializing Socket.IO
require('./appointments/scheduler');


// Connect to MongoDB
require('./config/mongoose');
//FrontendOrigins
const allowedOrigins = ['http://localhost:3000','http://localhost:3001'];
// CORS Configuration


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for images
app.use('/images', express.static(path.join(__dirname, 'doctor', 'images')));
app.use('/images', express.static(path.join(__dirname, 'patient', 'images')));
app.use('/images', express.static(path.join(__dirname, 'prescription', 'images')));
app.use('/images', express.static(path.join(__dirname, 'appointments', 'images')));
app.use('/images', express.static(path.join(__dirname, 'payment', 'images')));
app.use('/images', express.static(path.join(__dirname, 'announcement', 'images')));
app.use('/images', express.static(path.join(__dirname, 'news', 'images')));
app.use('/images', express.static(path.join(__dirname, 'specialty', 'images')));
app.use('/images', express.static(path.join(__dirname, 'services', 'images')));
app.use('images', express.static(path.join(__dirname, 'about-company', 'images')));

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));



app.get('/uploads/:filename', (req, res) => {
  const fileName = req.params.filename;
  const filePath = path.join(__dirname, 'public/uploads', fileName);

  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } else {
    res.status(404).send('File not found.');
  }
});

app.use(express.static(path.join(__dirname, '../frontend/public')));

const UserRoutes = require('./user/user_routes');
UserRoutes(app);
// Route Imports
const DoctorRoutes = require('./doctor/doctor_routes');
DoctorRoutes(app);
const PatientRoutes = require('./patient/patient_routes');
PatientRoutes(app);
const MedicalSecretaryRoutes = require('./medicalsecretary/medicalsecretary_routes');
MedicalSecretaryRoutes(app);
const CashierRoutes = require('./cashier/cashier_routes');
CashierRoutes(app);
const AdminRoutes = require('./admin/admin_routes');
AdminRoutes(app);

const FindingsRoutes = require('./findings/findings_routes');
FindingsRoutes(app);
const PrescriptionRoutes = require('./prescription/prescription_routes');
PrescriptionRoutes(app);
const AppointmentRoutes = require('./appointments/appointment_routes');
AppointmentRoutes(app);
const AnnouncementRoutes = require('./announcement/announcement.routes');
AnnouncementRoutes(app);
const ImmunizationRoutes = require('./immunization/immunization_routes');
ImmunizationRoutes(app);
const NewsRoutes = require('./news/news_routes');
NewsRoutes(app);
const LaboratoryRoutes = require('./laboratory/laboratory_routes');
LaboratoryRoutes(app);
const SpecialtyRoutes = require('./specialty/specialty_routes');
SpecialtyRoutes(app);
const ServiceRoutes = require('./services/service_routes');
ServiceRoutes(app);
const HmoRoutes = require('./hmo/hmo_routes');
HmoRoutes(app);
const ChatRoutes = require('./chat/chat_routes');
ChatRoutes(app);
const ProxyRoutes = require('./proxy/proxyRoutes');
ProxyRoutes(app);
const AboutCompanyRoutes = require('./about-company/aboutcompany_routes');
AboutCompanyRoutes(app);


// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public', 'index.html'));
});
app.get('/keepalive', (req, res) => {
  res.status(200).send('Service is alive');
});

app.get('/debug/session', (req, res) => {
  res.json({
    sessionID: req.sessionID,
    session: req.session,
    cookies: req.cookies,
    hasUser: !!req.session.user
  });
});

app.post('/debug/set-cookie', (req, res) => {
  req.session.testValue = 'test-' + Date.now();
  req.session.save(err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, session: req.session });
  });
});
// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
