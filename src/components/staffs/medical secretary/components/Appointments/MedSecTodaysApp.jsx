import React, { useState, useEffect } from 'react';
import { Table, Button, Container, Pagination, Form, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import RescheduleModal from '../../../../practitioner/appointment/Reschedule Modal/RescheduleModal';
import { Link } from 'react-router-dom';

function MedSecTodaysApp({ allAppointments, setAllAppointments }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [alldoctors, setalldoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedAccountStatus, setSelectedAccountStatus] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(""); // Category filter state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    axios.get(`http://localhost:8000/doctor/api/alldoctor`)
      .then((result) => {
        setalldoctors(result.data.theDoctor);
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  const handleConfirmReschedule = (rescheduledReason) => {
    const newStatus = {
      rescheduledReason: rescheduledReason,
      status: 'Rescheduled'
    };
    axios.put(`http://localhost:8000/doctor/${selectedAppointment._id}/rescheduledstatus`, newStatus)
      .then(() => {
        setAllAppointments(prevAppointments =>
          prevAppointments.map(appointment =>
            appointment._id === selectedAppointment._id ? { ...appointment, status: 'Rescheduled', rescheduledReason: rescheduledReason } : appointment
          )
        );
      })
      .catch((err) => {
        console.log(err);
      });
  };

  // Helper to get today's date
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayDate = getTodayDate();

  const ongoingAppointment = (appointmentID) => {
    const newStatus = { status: 'Ongoing' };
    axios.put(`http://localhost:8000/medicalsecretary/api/${appointmentID}/ongoing`, newStatus)
      .then((response) => {
        setAllAppointments(prevAppointments =>
          prevAppointments.map(appointment =>
            appointment._id === appointmentID ? { ...appointment, status: 'Ongoing' } : appointment
          )
        );
      })
      .catch((err) => {
        console.log(err);
      });
  };

  // Function to convert 24-hour time to 12-hour format with AM/PM
  const convertTo12HourFormat = (time24h) => {
    if (!time24h) return ''; // Return empty string if no time
    const [hours, minutes] = time24h.split(':');
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12; // Convert to 12-hour format, 0 becomes 12
    return `${hour12}:${minutes} ${period}`;
  };

  // Extract unique categories from all appointments
  const getUniqueCategories = () => {
    const categories = allAppointments.flatMap(appointment => 
      appointment.appointment_type.map(typeObj => typeObj.category)
    );
    return [...new Set(categories)]; // Remove duplicates
  };

  const uniqueCategories = getUniqueCategories();

  // Filter appointments based on criteria
  const filteredAppointments = allAppointments
    .filter(appointment => appointment.status === 'Scheduled')
    .filter(appointment => {
      const appointmentDate = new Date(appointment.date).toISOString().split('T')[0];
      return appointmentDate === todayDate;
    })
    .filter(appointment => 
      `${appointment.patient.patient_firstName} ${appointment.patient.patient_middleInitial}. ${appointment.patient.patient_lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
    )
    .filter(appointment => selectedDoctor === "" || appointment?.doctor._id === selectedDoctor)
    .filter(appointment => selectedAccountStatus === "" || appointment.patient.accountStatus === selectedAccountStatus)
    .filter(appointment => selectedCategory === "" || appointment.appointment_type.some(typeObj => typeObj.category === selectedCategory)); // Category filter

  const indexOfLastAppointment = currentPage * entriesPerPage;
  const indexOfFirstAppointment = indexOfLastAppointment - entriesPerPage;
  const currentAppointments = filteredAppointments.slice(indexOfFirstAppointment, indexOfLastAppointment);

  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(filteredAppointments.length / entriesPerPage); i++) {
    pageNumbers.push(i);
  }

  const handleReschedule = (appointment) => {
    setSelectedAppointment(appointment);
    setShowRescheduleModal(true);
  };

  const handleCloseRescheduleModal = () => {
    setShowRescheduleModal(false);
    setSelectedAppointment(null);
  };

  return (
    <>
      <Container>
        <div style={{ padding: '30px', width: '100%' }}>
          <h1>Today's Appointments</h1>
          <Container className="p-0">
            <Row className="g-3">
              {/* Doctor Filter */}
              <Col lg={4} md={6} sm={12}>
                <Form.Group controlId="formDoctorSearch" className="d-flex align-items-center">
                  <Form.Label style={{ marginRight: '1vh' }}>Doctor:</Form.Label>
                  <Form.Control
                    as="select"
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">All Doctors</option>
                    {alldoctors.map((doctor) => (
                      <option key={doctor._id} value={doctor._id}>
                        {`${doctor.dr_firstName} ${doctor.dr_middleInitial}. ${doctor.dr_lastName}`}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>

              {/* Patient Search Input */}
              <Col lg={4} md={6} sm={12}>
                <Form.Group controlId="formSearch" className="d-flex align-items-center">
                  <Form.Label style={{ marginLeft: '1vh', marginRight: '1vh' }}>Patient:</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </Form.Group>
              </Col>

              {/* Category Filter Dropdown */}
              <Col lg={3} md={5} sm={12}>
                <Form.Group controlId="formCategoryFilter" className="d-flex align-items-center">
                  <Form.Label style={{ marginLeft: '1vh', marginRight: '1vh' }}>Category:</Form.Label>
                  <Form.Control
                    as="select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">All Categories</option>
                    {uniqueCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>

              {/* Account Status Filter */}
              <Col lg={3} md={5} sm={12} className="p-0">
                <Form.Group controlId="formAccountStatus" className="d-flex align-items-center">
                  <Form.Label style={{ marginLeft: '1vh', marginRight: '1vh' }}>Status:</Form.Label>
                  <Form.Control
                    as="select"
                    value={selectedAccountStatus}
                    onChange={(e) => setSelectedAccountStatus(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">All Account Statuses</option>
                    <option value="Registered">Registered</option>
                    <option value="Unregistered">Unregistered</option>
                  </Form.Control>
                </Form.Group>
              </Col>
            </Row>
          </Container>

          <Table responsive striped variant="light" className="mt-3">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Doctor Name</th>
                <th>Service</th>
                <th>Date</th>
                <th>Time</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentAppointments.map((appointment) => {
                const patient = appointment.patient;
                const patientName = `${patient.patient_firstName} ${patient.patient_middleInitial}. ${patient.patient_lastName}`;

                const doctor = appointment.doctor;
                const doctorName = `${doctor?.dr_firstName} ${doctor?.dr_middleInitial}. ${doctor?.dr_lastName}`;
                const appointmentTypes = appointment.appointment_type.map(typeObj => typeObj.appointment_type).join(', ');

                return (
                  <tr key={appointment._id}>
                    <td>{patientName}</td>
                    <td>{doctorName}</td>
                    <td>{appointmentTypes}</td>
                    <td>{new Date(appointment.date).toLocaleDateString()}</td>
                    <td>{convertTo12HourFormat(appointment.time)}</td> {/* Convert time to 12-hour AM/PM format */}
                    <td>{appointment.reason}</td>
                    <td>
                      <div className="d-flex justify-content-center">
                        <div className="scheduled-appointment">
                          {appointment.status}
                        </div>
                      </div>
                    </td>
                    <td>
                      <Button variant="success" onClick={() => ongoingAppointment(appointment._id)}>Ongoing</Button>
                      <Link variant="warning" onClick={() => handleReschedule(appointment)}>Reschedule</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>

          <Container className="d-flex justify-content-between p-0">
            <div style={{ height: '40%', width: '40%' }} className="d-flex p-0 align-content-center">
              <div style={{ height: '60%', width: '60%' }}>
                <label>Entries per page:</label>
              </div>
              <select value={entriesPerPage} onChange={(e) => setEntriesPerPage(parseInt(e.target.value))}>
                <option value={5}>5</option>
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>

            <Pagination>
              <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
              <Pagination.Prev onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} />
              {pageNumbers.map(number => (
                <Pagination.Item key={number} active={number === currentPage} onClick={() => setCurrentPage(number)}>
                  {number}
                </Pagination.Item>
              ))}
              <Pagination.Next onClick={() => setCurrentPage(prev => Math.min(prev + 1, pageNumbers.length))} disabled={currentPage === pageNumbers.length} />
              <Pagination.Last onClick={() => setCurrentPage(pageNumbers.length)} disabled={currentPage === pageNumbers.length} />
            </Pagination>

            {selectedAppointment && (
              <RescheduleModal 
                show={showRescheduleModal} 
                handleClose={handleCloseRescheduleModal} 
                appointment={selectedAppointment} 
                handleConfirm={handleConfirmReschedule}
              />
            )}
          </Container>
        </div>
      </Container>
    </>
  );
}

export default MedSecTodaysApp;
