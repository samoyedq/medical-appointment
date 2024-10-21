// File: AdminNewsManagement.js

import React from 'react';
import { useLocation } from 'react-router-dom';

import NewsAnnouncement from '../../news/NewsAnnouncement';
import AdminNavbar from '../navbar/AdminNavbar';
import SidebarAdmin from '../sidebar/SidebarAdmin';
import { Row, Col, Container } from 'react-bootstrap';

function AdminNewsManagement() {
  const location = useLocation();
  const { userId, userName, role } = location.state || {};

  const containerStyle = {
    display: 'flex',
    height: '100vh', // Full height of the viewport
    overflow: 'hidden', // Prevents scrolling issues for the main layout
  };

  const sidebarWrapperStyle = {
    flex: '0 0 250px', // Sidebar fixed width
    height: '100vh',
    overflowY: 'auto', // Make sidebar scrollable if necessary
  };

  const contentWrapperStyle = {
    width: '100%',
    height: '100vh',
    overflow: 'auto', // Enable scrolling inside the content area
    display: 'flex',
    flexDirection: 'column', // Navbar on top, content below
  };

  const announcementWrapperStyle = {
    flex: '1', // Take available space for announcements
    overflowY: 'auto', // Ensure the announcements scroll properly
    padding: '3rem', // Add padding for better layout
  };

  return (
    <div style={containerStyle}>
      <div >
        <SidebarAdmin userId={userId} userName={userName} role={role} />
      </div>
      <div style={contentWrapperStyle}>
        <AdminNavbar userId={userId} userName={userName} role={role} />
        <div style={announcementWrapperStyle}>
          <Container
            className="d-flex justify-content-center"
            style={{ padding: '0 200px' }}
          >
            <Row>
              <Col>
                <NewsAnnouncement
                  user_image=""
                  user_name={userName}
                  user_id={userId}
                  role={role}
                />
              </Col>
            </Row>
          </Container>
        </div>
      </div>
    </div>
  );
}

export default AdminNewsManagement;