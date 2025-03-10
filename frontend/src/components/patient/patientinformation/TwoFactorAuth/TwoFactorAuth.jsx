import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { ip } from '../../../../ContentExport';
import Swal from 'sweetalert2';
import { useUser } from '../../../../components/UserContext';

function TwoFactorAuth({ show, handleClose }) {
    const [qrCode, setQrCode] = useState(null);
    const [secretKey, setSecretKey] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [setupStep, setSetupStep] = useState('generate'); // 'generate', 'verify', or 'complete'
    
    // Get user from context instead of session
    const { user } = useUser();

    // Auto-generate QR code when modal opens if user is authenticated
    useEffect(() => {
        if (user && user._id && show) {
            setupTwoFactor();
        }
    }, [user, show]);

    // Setup 2FA function
    const setupTwoFactor = async (regenerate = false) => {
        try {
            setLoading(true);
            const response = await axios.post(`${ip.address}/api/set-up-2fa`, { 
                regenerate,
                id: user?._id,
                role: user?.role || 'Patient' // Default to Patient if no role found
            }, {
                withCredentials: true // Make sure to include cookies
            });

            if (response.data.qrCode && response.data.secret) {
                setQrCode(response.data.qrCode);
                setSecretKey(response.data.secret);
                setSetupStep('verify');
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error setting up 2FA'
                });
            }
        } catch (error) {
            console.error('Error setting up 2FA:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Could not set up 2FA. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = () => {
        setupTwoFactor(true);
        setQrCode(null);
        setSecretKey(null);
    };

    const handleVerifyCode = async () => {
        if (!verificationCode) {
            Swal.fire({
                icon: 'warning',
                title: 'Input Required',
                text: 'Please enter the verification code from your authenticator app'
            });
            return;
        }

        try {
            setLoading(true);
            const response = await axios.post(`${ip.address}/api/verify-2fa`, {
                userId: user?._id,
                role: user?.role || 'Patient',
                code: verificationCode
            }, {
                withCredentials: true // Make sure to include cookies
            });

            if (response.data.verified) {
                setSetupStep('complete');
                
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Two-factor authentication has been enabled for your account',
                }).then(() => {
                    handleClose();
                    window.location.reload(); // Refresh the page
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Verification Failed',
                    text: 'The code you entered is invalid. Please try again.'
                });
            }
        } catch (error) {
            console.error('Error verifying 2FA code:', error);
            Swal.fire({
                icon: 'error',
                title: 'Verification Error',
                text: error.response?.data?.message || 'Failed to verify the code. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    // If no user is found, show an error message
    if (!user || !user._id) {
        return (
            <Modal size="lg" show={show} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Two Factor Authentication</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="danger">
                        You need to be logged in to set up two-factor authentication.
                        Please refresh the page and try again.
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    }

    return (
        <Modal size="lg" show={show} onHide={handleClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>Register for Two Factor Authentication</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p style={{ fontSize: '13px', fontStyle: 'italic', textAlign: 'center' }}>
                    Use any authenticator app (Google Authenticator or Microsoft Authenticator) to add a protection layer to your account
                </p>
                
                {/* QR Code Display */}
                {qrCode && (
                    <div className="tfa-container">
                        <div className="tfa-card">
                            <div className="tfa-cardqr">
                                <div className="tfa-cardqr1 text-center">
                                    <img src={qrCode} alt="QR Code" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Verification Code Input */}
                {setupStep === 'verify' && qrCode && (
                    <div className="mt-4">
                        <Alert variant="info">
                            Scan the QR code with your authenticator app, then enter the verification code below.
                        </Alert>
                        <Form.Group className="mb-3">
                            <Form.Label>Enter verification code from your authenticator app</Form.Label>
                            <Form.Control 
                                type="text" 
                                placeholder="e.g. 123456" 
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                maxLength={6}
                            />
                        </Form.Group>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Cancel
                </Button>
                
                {setupStep === 'generate' && (
                    <Button 
                        variant="primary" 
                        onClick={() => setupTwoFactor(false)}
                        disabled={loading}
                    >
                        {loading ? 'Generating...' : 'Generate QR Code'}
                    </Button>
                )}
                
                {setupStep === 'verify' && (
                    <>
                        <Button 
                            variant="outline-primary" 
                            onClick={handleRegenerate}
                            disabled={loading}
                        >
                            Regenerate Code
                        </Button>
                        <Button 
                            variant="success" 
                            onClick={handleVerifyCode}
                            disabled={loading || !verificationCode}
                        >
                            {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
                        </Button>
                    </>
                )}
            </Modal.Footer>
        </Modal>
    );
}

export default TwoFactorAuth;