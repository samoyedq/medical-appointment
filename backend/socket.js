const { Server } = require('socket.io');
const ChatMessage = require('./chat/chat_model');
const Patient = require('./patient/patient_model');
const MedicalSecretary = require('./medicalsecretary/medicalsecretary_model');
const Admin = require('./admin/admin_model');
const Doctor = require('./doctor/doctor_model'); 

let io;
const clients = {}; 

module.exports = {
  init: (server) => {
    io = new Server(server, {
      cors: {
        origin: [
        'https://medical-appointment-mwuw.vercel.app',
        'http://localhost:3000',
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
      },
    });

    io.on('connection', (socket) => {
      // console.log('A user connected:', socket.id);

      socket.on('identify', async (userData) => {
        console.log('Identify event received:', userData);

        if (!userData.userId) {
          console.error('User ID is undefined in identify event');
          return;
        }

        socket.userId = userData.userId.toString();
        socket.userRole = userData.userRole;
        clients[socket.userId] = socket;

        // If user is a doctor, check their ongoing session
        if (socket.userRole === 'Doctor') {
          const doctor = await Doctor.findById(socket.userId).populate('dr_appointments');
          
          if (doctor) {
            const lastAppointment = doctor.dr_appointments.length > 0 
              ? doctor.dr_appointments[doctor.dr_appointments.length - 1] 
              : null;  // Ensure lastAppointment is defined
          
            if (lastAppointment && lastAppointment.status === 'Ongoing') {
              console.log("Last appointment:", lastAppointment.status);
              const updatedDoctor = await Doctor.findByIdAndUpdate(
                socket.userId, 
                { activityStatus: 'In Session' }, 
                { new: true }
              );
              
              if (updatedDoctor) {
                io.emit("doctorStatusUpdate", {
                  doctorId: updatedDoctor._id.toString(),
                  activityStatus: 'In Session',
                  patientId: updatedDoctor.patientId,
                });
              }
            } else { 
              // If no last appointment or last appointment isn't "Ongoing", set status to "Online"
              const updatedDoctor = await Doctor.findByIdAndUpdate(
                socket.userId,
                { activityStatus: 'Online' },
                { new: true }
              );
          
              if (updatedDoctor) {
                io.emit("doctorStatusUpdate", {
                  doctorId: updatedDoctor._id.toString(),
                  activityStatus: updatedDoctor.activityStatus,
                });
              }
            }
          }
          
        }

        // Handle other roles like Medical Secretary or Admin
        if (socket.userRole === 'Medical Secretary' || socket.userRole === 'Admin') {
          const patients = await ChatMessage.aggregate([
            {
              $match: {
                senderModel: 'Patient',
              },
            },
            {
              $group: { _id: '$sender' },
            },
            {
              $lookup: {
                from: 'patients',
                localField: '_id',
                foreignField: '_id',
                as: 'patientInfo',
              },
            },
            {
              $unwind: '$patientInfo',
            },
            {
              $project: {
                _id: '$patientInfo._id',
                name: {
                  $concat: [
                    '$patientInfo.patient_firstName',
                    ' ',
                    '$patientInfo.patient_lastName',
                  ],
                },
              },
            },
          ]);

          socket.emit('patient list', patients);
        }
      });

      socket.on('chat message', async (data) => {
        console.log('Message received:', data);

        let receivers = [];

        if (data.senderModel === 'Patient') {
          // Patient is sending a message to staff
          const medSecs = await MedicalSecretary.find({}, '_id');
          const admins = await Admin.find({}, '_id');
          receivers = [
            ...medSecs.map((medSec) => medSec._id.toString()),
            ...admins.map((admin) => admin._id.toString()),
          ];
          data.receiverModel = 'Staff';
        } else if (data.senderModel === 'Medical Secretary' || data.senderModel === 'Admin') {
          if (data.receiverId) {
            // Staff is sending a message to a patient
            receivers = [data.receiverId.toString()];
            data.receiverModel = 'Patient';
          } else {
            console.error('Receiver ID is required for staff messages');
            return;
          }
        } else {
          console.error('Invalid sender model');
          return;
        }

        const chatMessage = new ChatMessage({
          sender: data.senderId,
          senderModel: data.senderModel,
          receiver: receivers,
          receiverModel: data.receiverModel,
          message: data.message,
        });

        // Get sender's name
        const senderName = await getSenderName(chatMessage.sender, chatMessage.senderModel);
        chatMessage.senderName = senderName;

        await chatMessage.save();

        const messageData = {
          _id: chatMessage._id.toString(),
          sender: chatMessage.sender.toString(),
          senderModel: chatMessage.senderModel,
          senderName: senderName,
          receiver: chatMessage.receiver.map((id) => id.toString()),
          receiverModel: chatMessage.receiverModel,
          message: chatMessage.message,
          createdAt: chatMessage.createdAt,
        };

        // Emit the message back to the sender
        const senderSocket = clients[data.senderId];
        if (senderSocket) {
          senderSocket.emit('chat message', messageData);
        }

        // Emit the message to the appropriate receivers, excluding the sender
        if (data.senderModel === 'Patient') {
          // Emit to all connected Medical Secretaries and Admins
          for (let userId in clients) {
            const userSocket = clients[userId];
            if (
              (userSocket.userRole === 'Medical Secretary' || userSocket.userRole === 'Admin') &&
              userId !== data.senderId
            ) {
              userSocket.emit('chat message', messageData);
            }
          }
        } else if (data.senderModel === 'Medical Secretary' || data.senderModel === 'Admin') {
          // Emit to the patient if connected
          const receiverSocket = clients[data.receiverId];
          if (receiverSocket && receiverSocket.userRole === 'Patient') {
            receiverSocket.emit('chat message', messageData);
          }

          // Emit to other staff members (excluding the sender)
          for (let userId in clients) {
            const userSocket = clients[userId];
            if (
              (userSocket.userRole === 'Medical Secretary' || userSocket.userRole === 'Admin') &&
              userId !== data.senderId
            ) {
              userSocket.emit('chat message', messageData);
            }
          }
        }
      });

      // Handle 'notification read' event if needed
      socket.on('notification read', (notificationId) => {
        console.log(`Notification ${notificationId} marked as read by user ${socket.userId}`);
        // Additional logic can be implemented here, if desired.
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.id);

        if (socket.userRole === 'Doctor') {
          const updatedDoctor = await Doctor.findByIdAndUpdate(
            socket.userId,
            { activityStatus: 'Offline', lastActive: Date.now() },
            { new: true }
          );
          if (updatedDoctor) {

      
            io.emit('doctorStatusUpdate', {
                doctorId: updatedDoctor._id.toString(),
                activityStatus: updatedDoctor.activityStatus,
                lastActive: updatedDoctor.lastActive
              });
          

            console.log("Emitting doctorStatusUpdate:", {
              doctorId: updatedDoctor._id.toString(),
              activityStatus: updatedDoctor.activityStatus,
              lastActive: updatedDoctor.lastActive,
            });
          }
        }
      });
    });


    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  },
  clients: clients,

  broadcastGeneralNotification: (notificationData) => {
    for (let userId in clients) {
      const userSocket = clients[userId];
      if (userSocket.userRole === 'Medical Secretary' || userSocket.userRole === 'Admin') {
        userSocket.emit('newGeneralNotification', notificationData);
      }
    }
  },

  broadcastNotificationToAdmins: (notificationData) => {
    for (let userId in clients) {
      const userSocket = clients[userId];
      if (userSocket.userRole === 'Admin') {
        userSocket.emit('newGeneralNotification', notificationData);
      }
    }
  },

  broadcastNotificationToMedSecs: (notificationData) => {
    for (let userId in clients) {
      const userSocket = clients[userId];
      if (userSocket.userRole === 'Medical Secretary') {
        userSocket.emit('newGeneralNotification', notificationData);
      }
    }
  },
};

async function getSenderName(senderId, senderModel) {
  if (senderModel === 'Patient') {
    const patient = await Patient.findById(senderId);
    return `${patient.patient_firstName} ${patient.patient_lastName}`;
  } else if (senderModel === 'Medical Secretary') {
    const medSec = await MedicalSecretary.findById(senderId);
    return `${medSec.ms_firstName} ${medSec.ms_lastName}`;
  } else if (senderModel === 'Admin') {
    const admin = await Admin.findById(senderId);
    return `${admin.firstName} ${admin.lastName}`;
  } else {
    return 'Unknown Sender';
  }
}
