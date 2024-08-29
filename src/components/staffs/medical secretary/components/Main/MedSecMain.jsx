import { useParams, useLocation } from 'react-router-dom';
import MedSecNavbar from '../../navbar/MedSecNavbar';
import MedSecTodaysApp from '../Appointments/MedSecTodaysApp';
import MedSecPending from '../Appointments/MedSecPending';
import MedSecOngoing from '../Appointments/MedSecOngoing';
import MedSecDashboard from '../Dashboard/MedSecDashboard'; // Fixed typo in component name
import { Container, Nav, Row } from 'react-bootstrap';
import axios from 'axios';
import React, { useEffect, useState } from 'react';

function MedSecMain() {
  const { msid } = useParams();
  const location = useLocation(); 
  const [allappointments, setallappointments] = useState([]);
  const [alldoctors, setalldoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [activeTab, setActiveTab] = useState("pending");


  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]); 

  useEffect(() => {
    axios.get(`http://localhost:8000/medicalsecretary/api/allappointments`)
      .then((result) => {
        setallappointments(result.data.Appointments);
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  useEffect(() => {
    axios.get(`http://localhost:8000/doctor/api/alldoctor`)
      .then((result) => {
        setalldoctors(result.data.theDoctor);
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  return (
    <>
      <MedSecNavbar /> {/* Fixed navbar at the top */}
      <div className="content-wrapper justify-content-center" style={{ overflowY: 'auto', height: 'calc(100vh - 56px)', width: '100%' }}>
        <Container style={{ paddingTop: '10px' }}>
          <Row>
            <Nav fill variant="tabs" activeKey={activeTab} onSelect={setActiveTab}>
              <Nav.Item>
                <Nav.Link eventKey="pending">Pending Appointments</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="todays">Today's Appointments</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="ongoing">Ongoing Appointments</Nav.Link>
              </Nav.Item>
            </Nav>
          </Row>
        </Container>

        <Container>
          <MedSecDashboard />

          {activeTab === "todays" && (
            <MedSecTodaysApp
              allAppointments={allappointments}
              setAllAppointments={setallappointments}
              selectedDoctor={selectedDoctor}
            />
          )}
          {activeTab === "pending" && (
            <MedSecPending
              allAppointments={allappointments}
              setAllAppointments={setallappointments}
              selectedDoctor={selectedDoctor}
            />
          )}
          {activeTab === "ongoing" && (
            <MedSecOngoing
              allAppointments={allappointments}
              setAllAppointments={setallappointments}
              selectedDoctor={selectedDoctor}
            />
          )}
        </Container>
      </div>
    </>
  );
}

export default MedSecMain;
