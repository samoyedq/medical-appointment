// socket.js

const { Server } = require('socket.io');
const ChatMessage = require('./chat/chat_model');
const Patient = require('./patient/patient_model');
const MedicalSecretary = require('./medicalsecretary/medicalsecretary_model');
const Admin = require('./admin/admin_model');
const Doctor = require('./doctor/doctor_model'); // Make sure the path is correct

let io;
const clients = {}; // Map to keep track of connected users

module.exports = {
  init: (server) => {
    io = new Server(server, {
      cors: {
        origin: '*', // Adjust as needed
        methods: ['GET', 'POST'],
      },
    });

    

    io.on('connection', (socket) => {
      console.log('A user connected:', socket.id);

      // Handle user identification
      socket.on('identify', async (userData) => {
        console.log('Identify event received:', userData);

        if (!userData.userId) {
          console.error('User ID is undefined in identify event');
          return;
        }

        socket.userId = userData.userId.toString();
        socket.userRole = userData.userRole;
        clients[socket.userId] = socket; // Store the socket instance

        console.log(`${socket.userRole} connected: ${socket.userId}`);

        if (socket.userRole === 'Medical Secretary' || socket.userRole === 'Admin') {
          // Send the list of patients who have chatted
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

      // Handle incoming chat messages
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

        if (socket.userId && clients[socket.userId]) {
          // If user is a doctor, set them offline and update lastActive
          if (socket.userRole === 'Doctor') {
            try {
              const updatedDoctor = await Doctor.findByIdAndUpdate(
                socket.userId,
                { activityStatus: 'Offline', lastActive: Date.now() },
                { new: true }
              );

              if (updatedDoctor) {
                // Notify all connected clients of the status change
                for (let userId in clients) {
                  const userSocket = clients[userId];
                  userSocket.emit('doctorStatusUpdate', {
                    doctorId: updatedDoctor._id.toString(),
                    activityStatus: updatedDoctor.activityStatus,
                  });
                }
              }
            } catch (err) {
              console.error('Error setting doctor offline on disconnect:', err);
            }
          }

          delete clients[socket.userId];
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

  // Utility function to emit a general notification to all Admin and Medical Secretary users
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

// Helper function to get the sender's name based on their model
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
