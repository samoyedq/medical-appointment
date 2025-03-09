const bcrypt = require('bcryptjs');
const Doctors = require('../doctor/doctor_model');
const Patients = require('../patient/patient_model');
const DoctorService = require('../doctor/doctor_service');
const socket = require('../socket');
const MedicalSecretary = require('../medicalsecretary/medicalsecretary_model');
const Admin = require('../admin/admin_model');
const Audit = require('../audit/audit_model');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const { staff_email } = require('../EmailExport');


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: staff_email.user,
    pass: staff_email.pass
  }
});

// Unified Login with 2FA Check
  const unifiedLogin = async (req, res) => {
    const { email, password, rememberMe, role, token } = req.body; // Include token for 2FA

    try {
      let user;
      if (role === 'Doctor') {
        user = await Doctors.findOne({ dr_email: email });
        if (!user) {
          return res.status(404).json({ message: 'No doctor with that email found' });
        }
        if (user.accountStatus === 'Review') {
          return res.status(403).json({ message: 'Your account is under review.' });
        }

        const match = await bcrypt.compare(password, user.dr_password);
        if (!match) {
          return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (user.twoFactorEnabled) {
          return res.json({
            twoFactorRequired: true,
            userId: user._id, 
            role: 'Doctor'
          });
        } else {
          const otp = speakeasy.totp({
            secret: speakeasy.generateSecret().base32,
            step: 600
          });

          user.otp = otp;
          user.otpExpires = Date.now() + 600000;
          await user.save();

          const mailOptions = {
            from: staff_email.user,
            to: user.dr_email,
            subject: 'Your Login Verification Code',
            text: `Your verification code is: ${otp}\nThis code will expire in 10 minutes.`
          };

          await transporter.sendMail(mailOptions);

          return res.json({
            emailVerificationRequired: true,
            message: 'Email OTP sent successfully',
            userId: user._id,
            role: 'Doctor'
          });
        }

        } else if (role === 'Patient') {
          user = await Patients.findOne({ patient_email: email });
        
          if (!user) {
            return res.status(404).json({ message: 'No patient with that email found' });
          }
        
          const match = await bcrypt.compare(password, user.patient_password);
          if (!match) {
            return res.status(401).json({ message: 'Invalid email or password' });
          }
        
          if (user.twoFactorEnabled) {
            // If 2FA is enabled, redirect to 2FA verification page
            return res.json({
              twoFactorRequired: true,
              userId: user._id,
              role: 'Patient'
            });
          } else {
            // Use Email OTP if 2FA is not enabled
            const otp = speakeasy.totp({
              secret: speakeasy.generateSecret().base32,
              step: 600 // 10 minutes
            });
        
            user.otp = otp;
            user.otpExpires = Date.now() + 600000; // 10 minutes
            await user.save();
        
            const mailOptions = {
              from: staff_email.user,
              to: user.patient_email,
              subject: 'Your Login Verification Code',
              text: `Your verification code is: ${otp}\nThis code will expire in 10 minutes.`
            };
        
            await transporter.sendMail(mailOptions);
        
            // Do not create the session here yet
            return res.json({
              emailVerificationRequired: true,
              message: 'Email OTP sent successfully',
              userId: user._id,  // Pass the userId for the front-end to process
              role: 'Patient'
            });
          }
        }
        else if (role === 'Medical Secretary') {
        user = await MedicalSecretary.findOne({ ms_email: email });
        if (!user) {
          return res.status(404).json({ message: 'No medical secretary with that email found' });
        }
        const match = await bcrypt.compare(password, user.ms_password);
        if (!match) {
          return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (user.status === "pending") {
          return res.json({
            pending: true, // This indicates to the frontend to show the modal
            message: 'Your account is pending. Please complete the verification.',
            userId: user._id,
            role: 'Medical Secretary',
          });
        } 

        if (user.status === "registered") {
          if (user.twoFactorEnabled) {
            // If 2FA is enabled, send to the 2FA verification page
            return res.json({
              twoFactorRequired: true,
              userId: user._id,
              role: 'Medical Secretary',
            });
          } else {
            // If Email OTP is required, generate and send OTP
            const otp = speakeasy.totp({
              secret: speakeasy.generateSecret().base32,
              step: 600, // 10 minutes
            });
  
            user.otp = otp;
            user.otpExpires = Date.now() + 600000; // OTP expires in 10 minutes
            await user.save();
  
            const mailOptions = {
              from: staff_email.user,
              to: user.ms_email,
              subject: 'Your Login Verification Code',
              text: `Your verification code is: ${otp}\nThis code will expire in 10 minutes.`,
            };
  
            await transporter.sendMail(mailOptions);
  
            return res.json({
              emailVerificationRequired: true,
              message: 'Email OTP sent successfully',
              userId: user._id,
              role: 'Medical Secretary',
            });
          }
        } else {
          return res.status(403).json({ message: 'Unknown user status' });
        }

        
  


    
      } else if (role === 'Admin') {
        user = await Admin.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: 'No admin with that email found' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // If user status is "pending"
      if (user.status === "pending") {
        return res.json({
          pending: true, // This indicates to the frontend to show the modal
          message: 'Your account is pending. Please complete the verification.',
          userId: user._id,
          role: 'Admin',
        });
      } 

      // For registered users
      if (user.status === "registered") {
        if (user.twoFactorEnabled) {
          // If 2FA is enabled, send to the 2FA verification page
          return res.json({
            twoFactorRequired: true,
            userId: user._id,
            role: 'Admin',
          });
        } else {
          // If Email OTP is required, generate and send OTP
          const otp = speakeasy.totp({
            secret: speakeasy.generateSecret().base32,
            step: 600, // 10 minutes
          });

          user.otp = otp;
          user.otpExpires = Date.now() + 600000; // OTP expires in 10 minutes
          await user.save();

          const mailOptions = {
            from: staff_email.user,
            to: user.email,
            subject: 'Your Login Verification Code',
            text: `Your verification code is: ${otp}\nThis code will expire in 10 minutes.`,
          };

          await transporter.sendMail(mailOptions);

          return res.json({
            emailVerificationRequired: true,
            message: 'Email OTP sent successfully',
            userId: user._id,
            role: 'Admin',
          });
        }
      } else {
        return res.status(403).json({ message: 'Unknown user status' });
      }

      } else {
        return res.status(400).json({ message: 'Invalid role provided' });
      }

    } catch (err) {
      console.error('Error in unifiedLogin:', err);
      return res.status(500).json({ message: 'Error logging in', error: err });
    }
  };

// Check Session
const getSession = (req, res) => {
 
  
  if (req.session && req.session.user) {
    return res.status(200).json({
      user: req.session.user,
      role: req.session.user.role
    });
  }
  
  return res.status(401).json({ message: 'No active session' });
};

// Logout
const unifiedLogout = async (req, res) => {
  try {
    // 1. Check if session has a user + role
    if (!req.session || !req.session.role) {
      console.log('No active session found for logout');
      return res.status(401).json({ message: 'No active session found' });
    }

    // 2. If the role is 'Doctor', set them Offline
    if (req.session.role === 'Doctor') {
      const doctorId = req.session.user ? req.session.user._id : null; 
      // Or if you stored doctor ID differently:
      // const doctorId = req.session.userId;

      if (doctorId) {
        console.log(`Doctor logout. Setting doctor ${doctorId} offline`);
        await DoctorService.updateActivityStatus(doctorId, 'Offline');

        // Broadcast the doctor's updated status in real-time
        const io = socket.getIO();
        const clients = socket.clients;
        for (let userId in clients) {
          const userSocket = clients[userId];
          userSocket.emit('doctorStatusUpdate', {
            doctorId: doctorId,
            activityStatus: 'Offline',
          });
        }
      }
    }

    // 3. Finally, destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ message: 'Error destroying session' });
      }
      // Clear the cookie
      res.clearCookie('connect.sid');
      console.log('Session destroyed and cookie cleared');
      return res.json({ message: 'Logged out successfully' });
    });
  } catch (error) {
    console.error('Error in unifiedLogout:', error);
    res.status(500).json({ message: 'Error logging out', error });
  }
};

const getUserById = async (id, role) => {
  switch (role) {
    case 'Doctor':
      return await Doctors.findById(id);
    case 'Patient':
      return await Patients.findById(id);
    case 'Medical Secretary':
      return await MedicalSecretary.findById(id);
    case 'Admin':
      return await Admin.findById(id);
    default:
      return null;
  }
};

const setupTwoFactor = async (req, res) => {
  const { id, role, regenerate } = req.body; // Extract id and role from request body
  try {
    let user;

    // Based on the role, fetch the correct user model
    if (role === 'Patient') {
      user = await Patients.findById(id); // Get patient by ID
    } else if (role === 'Doctor') {
      user = await Doctors.findById(id); // Get doctor by ID
    } else if (role === 'Medical Secretary') {
      user = await MedicalSecretary.findById(id); // Get medical secretary by ID
    } else if (role === 'Admin') {
      user = await Admin.findById(id); // Get admin by ID
    }

    // If no user is found, return a 404 error
    if (!user) {
      return res.status(404).json({ message: `${role} not found` });
    }

    let secret;
    if (!user.twoFactorSecret || regenerate) {
      // Generate a new secret key if the user does not have one or if regenerate flag is true
      secret = speakeasy.generateSecret({ length: 30 });
      user.twoFactorSecret = secret.base32;
      
      // Don't enable 2FA yet - just store the secret
      // twoFactorEnabled will be set to true only after verification
      user.twoFactorEnabled = false;
      
      await user.save(); // Save the changes
    } else {
      // Use the existing secret key
      secret = { base32: user.twoFactorSecret };
    }

    // Generate the OTP Auth URL with the saved secret key using speakeasy
    const otpAuthUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `Molino Polyclinic`,
      issuer: 'MyApp', // Adjust the issuer name accordingly
      encoding: 'base32'
    });

    const qrCode = await QRCode.toDataURL(otpAuthUrl);

    res.json({ qrCode, secret: secret.base32 });
  } catch (error) {
    console.error('Error generating 2FA secret:', error);
    res.status(500).json({ message: 'Error generating 2FA secret', error });
  }
};

const verifyTwoFactor = async (req, res) => {
  const { userId, role, code } = req.body;

  try {
    let user;

    // Retrieve user based on the role
    if (role === 'Patient') {
      user = await Patients.findById(userId);
    } else if (role === 'Doctor') {
      user = await Doctors.findById(userId);
    } else if (role === 'Medical Secretary') {
      user = await MedicalSecretary.findById(userId);
    } else if (role === 'Admin') {
      user = await Admin.findById(userId);
    }

    // If the user is not found, return an error
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if a secret exists
    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: 'No 2FA secret found for this user' });
    }

    // If no code is provided, return an error
    if (!code) {
      return res.status(400).json({ message: '2FA token is required' });
    }

    // Verify the 2FA token using the secret stored for the user
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (verified) {
      // Now enable 2FA after successful verification
      user.twoFactorEnabled = true;
      await user.save();

      // Determine the field names dynamically based on the role
      let firstName = '';
      let lastName = '';
      
      if (role === 'Patient') {
        firstName = user.patient_firstName;
        lastName = user.patient_lastName;
      } else if (role === 'Doctor') {
        firstName = user.dr_firstName;
        lastName = user.dr_lastName;
      } else if (role === 'Medical Secretary') {
        firstName = user.ms_firstName;
        lastName = user.ms_lastName;
      } else if (role === 'Admin') {
        firstName = user.firstName;
        lastName = user.lastName;
      }

      // Create session after successful 2FA verification
      req.session.user = {
        _id: user._id,
        email: user.email,
        firstName: firstName,
        lastName: lastName,
        role: role, // The role is passed in from the frontend
      };

      req.session.role = role;
      req.session.userId = user._id;

      // Set cookie options for the session
      req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      req.session.cookie.httpOnly = true;
      req.session.cookie.secure = process.env.NODE_ENV === 'production';
      req.session.cookie.sameSite = 'lax';

      // Create audit entry for login with 2FA
      const auditEntry = {
        user: user._id,
        userType: role, // Use the provided role
        action: 'Login with 2FA',
        description: `${role} has logged in with 2FA`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      };

      const newAudit = new Audit(auditEntry);
      await newAudit.save();
      await user.updateOne({ $push: { audits: newAudit._id } });

      res.json({
        verified: true,
        user: req.session.user,
        role: role,
      });
    } else {
      res.status(400).json({ verified: false, message: 'Invalid 2FA token' });
    }
  } catch (error) {
    console.error('Error verifying 2FA token:', error);
    res.status(500).json({ message: 'Error verifying 2FA token', error });
  }
};



const verifyEmailOTP = async (req, res) => {
  const { userId, otp, role } = req.body;

  console.log(req.body);
  try {
    let user;

    // Retrieve user based on the role
    if (role === 'Patient') {
      user = await Patients.findById(userId);
    } else if (role === 'Doctor') {
      user = await Doctors.findById(userId);
    } else if (role === 'Medical Secretary') {
      user = await MedicalSecretary.findById(userId);
    } else if (role === 'Admin') {
      user = await Admin.findById(userId);
    }

    // If the user is not found, return an error
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify OTP if it exists
    if (!user.otp || !user.otpExpires) {
      return res.status(400).json({ message: 'No OTP request found' });
    }

    // Check if OTP has expired
    if (new Date() > user.otpExpires) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Check if the OTP matches
    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Clear OTP fields after successful verification
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Determine the field names dynamically based on the role
    let firstName = '';
    let lastName = '';
    if (role === 'Patient') {
      firstName = user.patient_firstName;
      lastName = user.patient_lastName;
    } else if (role === 'Doctor') {
      firstName = user.dr_firstName;
      lastName = user.dr_lastName;
    } else if (role === 'Medical Secretary') {
      firstName = user.ms_firstName;
      lastName = user.ms_lastName;
    } else if (role === 'Admin') {
      firstName = user.firstName;
      lastName = user.lastName;
    }

    // Create session after successful OTP verification
    req.session.user = {
      _id: user._id,
      email: user.email,
      firstName: firstName,
      lastName: lastName,
      role: role,
    };

    req.session.role = role;
    req.session.userId = user._id;

    // Set cookie options for the session
    req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    req.session.cookie.httpOnly = true;
    req.session.cookie.secure = process.env.NODE_ENV === 'production';
    req.session.cookie.sameSite = 'lax';

    // Create audit entry for login with email OTP
    const auditEntry = {
      user: user._id,
      userType: role,
      action: 'Login with Email OTP',
      description: `${role} has logged in with Email OTP`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    const newAudit = new Audit(auditEntry);
    await newAudit.save();
    await user.updateOne({ $push: { audits: newAudit._id } });

    res.json({
      verified: true,
      user: req.session.user,
      role: role,
    });
  } catch (err) {
    console.error('Error verifying email OTP:', err);
    res.status(500).json({ message: 'Error verifying email OTP', error: err });
  }
};

const unableTwoFactorEnabled = async (req, res) => {
  const { userId, role } = req.body;
  
  try {
    let user;

    // Retrieve user based on the role
    if (role === 'Patient') {
      user = await Patients.findById(userId);
    } else if (role === 'Doctor') {
      user = await Doctors.findById(userId);
    } else if (role === 'Medical Secretary') {
      user = await MedicalSecretary.findById(userId);
    } else if (role === 'Admin') {
      user = await Admin.findById(userId);
    }

    // If the user is not found, return an error
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Disable 2FA for the user
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ message: 'Error disabling 2FA', error });
  }
};






module.exports = {
  unifiedLogin,
  getSession,
  unifiedLogout,
  setupTwoFactor,
  verifyTwoFactor,
  verifyEmailOTP,
  unableTwoFactorEnabled,
};
