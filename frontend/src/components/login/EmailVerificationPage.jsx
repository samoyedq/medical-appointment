import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ip } from '../../ContentExport';
import Swal from 'sweetalert2';
import axios from 'axios';
import { useUser } from '../UserContext';
import ForLoginAndSignupNavbar from '../landpage/ForLoginAndSignupNavbar';

const EmailVerificationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use fallback if location.state is undefined
  const { userId, role } = location.state || {}; // Fallback to empty object

  const { setUser, setRole, setAuthToken } = useUser();  // Use UserContext
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [attempts, setAttempts] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle the input change for the code
  const handleChange = (e, index) => {
    const value = e.target.value;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Focus next input field when the current one is filled
    if (value && index < 5) {
      document.getElementById(`code-input-${index + 1}`).focus();
    }
  };

  // Handle backspace functionality
  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && code[index] === '') {
      if (index > 0) {
        document.getElementById(`code-input-${index - 1}`).focus();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const enteredCode = code.join('');
    if (enteredCode.length !== 6) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Code',
        text: 'Please enter a 6-digit code.',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Send the OTP code to the backend for verification
      const response = await axios.post(`${ip.address}/api/verify-email-otp`, {
        userId: userId,
        role: role,
        otp: enteredCode,
      });

      if (response.data.verified) {
        // Store the JWT token
        setAuthToken(response.data.token);
        
        // Set user data in context
        setUser(response.data.user);
        setRole(response.data.role);

        // Navigate based on role
        setTimeout(() => {
            if(role === 'Patient'){
                navigate('/homepage'); 
            } else if (role === 'Doctor'){
                navigate('/dashboard');
            } else if (role === 'Admin') {
              navigate('/admin/dashboard/patient');
            } else if (role === 'Medical Secretary'){
              navigate('/medsec/dashboard');
            }
        }, 100);
      } else {
        setAttempts(attempts + 1);
        if (attempts + 1 >= 3) {
          await axios.post(`${ip.address}/api/logout`);
          Swal.fire({
            icon: 'error',
            title: '3 Failed Attempts',
            text: 'Your session has been destroyed due to multiple incorrect attempts.',
          });
          navigate('/'); // Redirect to login page after 3 failed attempts
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Invalid Code',
            text: 'The code you entered is incorrect. Please try again.',
          });
        }
      }
    } catch (error) {
      console.error('Error during email OTP verification:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred during email OTP verification.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <ForLoginAndSignupNavbar/>
    <div className="container-auth">
      <h2 className="title">Enter OTP Code</h2>
      <p className="subheading">Please enter the 6-digit code sent to your email.</p>

      <form onSubmit={handleSubmit}>
        <div className="input-container">
          {code.map((digit, index) => (
            <input
              key={index}
              type="text"
              maxLength="1"
              value={digit}
              onChange={(e) => handleChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              id={`code-input-${index}`}
              className="code-input"
              autoFocus={index === 0}
            />
          ))}
        </div>
        <div className="submit-container">
          <button
            type="submit"
            disabled={isSubmitting}
            className="submit-button"
          >
            {isSubmitting ? 'Verifying...' : 'Verify Code'}
          </button>
        </div>
      </form>
    </div>
    </>
  );
};

export default EmailVerificationPage;