import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Container, Navbar, Nav, NavDropdown } from 'react-bootstrap';
import { Bell } from 'react-bootstrap-icons';
import './PatientNavBar.css';
import { image, ip } from '../../../ContentExport';
import axios from 'axios';
import io from 'socket.io-client';
import { useUser } from '../../UserContext';
import LogoutModal from '../../practitioner/sidebar/LogoutModal';

function PatientNavBar({ pid }) {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const [showNotifications, setShowNotifications] = useState(false);
  const [theImage, setImage] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  

  const defaultImage = `${ip.address}/images/default-profile.jpg`;

  // Use useRef to maintain the socket instance
  const socketRef = useRef();
  const location = useLocation();
  // useEffect(() => {
  //   if (!pid) {
  //     navigate('/medapp/login');
  //   }
  // }, [pid, navigate]);

  const handleLogout = () => {
    setShowLogoutModal(true); // Show the logout confirmation modal
};

const cancelLogout = () => {
  setShowLogoutModal(false);
};

  const confirmLogout = async () => {
    try {
      await axios.post(`${ip.address}/api/logout`, {}, { withCredentials: true });
      setUser(null); // Clear patient context
      navigate('/medapp/login'); // Redirect to login page
    } catch (error) {
      console.error('Error logging out:', error);
      alert('Failed to log out. Please try again.');
    }
  };


  // Initialize socket.io client
  useEffect(() => {
    socketRef.current = io(ip.address);

    socketRef.current.on('connect', () => {
      // console.log('Socket connected:', socketRef.current.id);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    if (pid) {
      socketRef.current.emit('identify', { userId: pid, userRole: 'Patient' });
    } else {
      console.warn('Patient ID is undefined');
    }

    socketRef.current.on('newNews', (data) => {
      const notification = {
        _id: data.notificationId, // Use the notification ID from the server
        message: data.message,
        isRead: false,
        link: data.link,
        type: 'News',
        createdAt: new Date().toISOString(),
      };
      setNotifications((prevNotifications) => [notification, ...prevNotifications]);
      showBrowserNotification(data.message);
    });

    socketRef.current.on('appointmentStatusUpdate', (data) => {
      if (data.patientId === pid) {
        const notification = {
          _id: data.notificationId, // Use the notification ID from the server
          message: data.message,
          isRead: false,
          link: data.link,
          type: 'StatusUpdate',
          createdAt: new Date().toISOString(),
        };
        setNotifications((prevNotifications) => [notification, ...prevNotifications]);
        showBrowserNotification(data.message);
      }
    });

    socketRef.current.on('disconnect', () => {
      // console.log('Socket disconnected');
    });

    socketRef.current.io.on('reconnect', () => {
      // console.log('Socket reconnected');
      if (pid) {
        socketRef.current.emit('identify', { userId: pid, userRole: 'Patient' });
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [pid]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    // This will handle redirects if the user isn't logged in or is not a patient
    // if (!user || !user._id || user.role !== "Patient") {
    //   navigate('/medapp/login');
    //   return;
    // }
    
    // If we have a valid user, get their notifications
    if (user._id) {
      axios
        .get(`${ip.address}/api/patient/api/onepatient/${user._id}`)
        .then((res) => {
          const patientData = res.data.thePatient;
          setImage(patientData.patient_image || defaultImage);
          const sortedNotifications = (patientData.notifications || []).sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
          setNotifications(sortedNotifications);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }, [user, navigate]);


  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const markAsRead = async (notification) => {
    try {
      if (notification.link) {
        navigate(notification.link, { state: { pid } });
      }

      if (!notification._id) {
        console.error('Notification ID is undefined');
        return;
      }

      await axios.put(`${ip.address}/api/notifications/${notification._id}/read`);

      setNotifications((prevNotifications) =>
        prevNotifications.map((notif) =>
          notif._id === notification._id ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const showBrowserNotification = (message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New Notification', {
        body: message,
        icon: image.logo || defaultImage,
      });
    }
  };


  // console.log('User', user)

  // Calculate unread notifications count and set max to 9+
  const unreadCount = notifications.filter((notif) => !notif.isRead).length;
  const displayCount = unreadCount > 9 ? '9+' : unreadCount;

  return (
    <Navbar

      expand="md"
      className="nav-bar-no-color navbar-fixed-top fixed-top px-5 py-0"
      style={{ zIndex: '2' }}
    >
      <Container fluid>
        <Link to={{ pathname: `/homepage`, state: { pid: user._id } }}>
          <img className="molino-logo" src={image.logo || defaultImage} alt="Logo" />
        </Link>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
          <Nav>
            <Nav.Link
              as={Link}
              to={{ pathname: `/homepage`, state: { pid: user._id } }}
              className={`pnb-nav-link ${location.pathname === '/homepage' ? 'active' : ''}`}
            >
              Home
            </Nav.Link>
            <Nav.Link
              as={Link}
              to={{ pathname: `/myappointment`, state: { pid: user._id } }}
              className={`pnb-nav-link ${location.pathname === '/myappointment' ? 'active' : ''}`}
            >
              My Appointments
            </Nav.Link>
            <Nav.Link
              as={Link}
              to={{ pathname: `/choosedoctor`, state: { pid: user._id } }}
              className={`pnb-nav-link ${location.pathname === '/choosedoctor' ? 'active' : ''}`}
            >
              Choose Doctor
            </Nav.Link>
          </Nav>

          <Nav>
            <Nav.Link onClick={toggleNotifications} className="position-relative">
              <Bell size={20} className={unreadCount > 0 ? 'sway' : ''} /> {/* Apply sway class when unread messages */}
              {unreadCount > 0 && (
                <span className="notification-dot"></span>
              )}
              {showNotifications && (
                <div className="notification-overlay">
                  {notifications.length > 0 ? (
                    notifications.map((notification, index) => (
                      <div
                        key={notification._id}
                        className={`notification-item ${!notification.isRead ? 'unread' : 'read'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          markAsRead(notification);
                        }}
                      >
                        <span className="notification-circle">
                          {notification.isRead ? (
                            <span className="circle read"></span>
                          ) : (
                            <span className="circle unread"></span>
                          )}
                        </span>
                        <span className="notification-message">{notification.message}</span>
                        {index < notifications.length - 1 && <hr />}
                      </div>
                    ))
                  ) : (
                    <div>No new notifications</div>
                  )}
                </div>
              )}
            </Nav.Link>



          </Nav>

          <Nav className="align-items-center">
            <NavDropdown
              title={
                <div className="d-flex align-items-center justify-content-end ">
                  <div className="ms-2 ">
                    <p className="m-0" style={{ fontSize: '14px', fontWeight: 'bold' }}>
                      {user.firstName} {user.lastName}
                    </p>
                    <p
                      className="m-0"
                      style={{
                        fontSize: '12px',
                        color: 'gray',
                        textAlign: 'end',
                      }}
                    >
                      Patient
                    </p>
                  </div>
                  <img
                    src={theImage ? `${ip.address}/${theImage}` : defaultImage}
                    alt="Profile"
                    style={{
                      objectFit: 'cover',
                      height: '40px',
                      width: '40px',
                      borderRadius: '50%',
                    }}
                    className="profile-image ms-3"
                  />
                </div>
              }
              id="basic-nav-dropdown"
              className="pnb-nav-link1"
            >
              <NavDropdown.Item
                as={Link}
                to="/accinfo"
                state={{ pid: user._id }}
              >
                Account Information
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item className="pnb-nav-link" onClick={handleLogout}>
                Logout
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>

        <LogoutModal 
                show={showLogoutModal} 
                onCancel={cancelLogout} 
                onConfirm={confirmLogout} 
            />
      </Container>
    </Navbar>

  );
}

export default PatientNavBar;
