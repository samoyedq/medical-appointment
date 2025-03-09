import { io } from 'socket.io-client';
import { ip } from './ContentExport';

const token = localStorage.getItem('token'); // Adjust based on your auth strategy
const socket = io(`${ip.address}`, {
    withCredentials: true,
    transports: ['polling', 'websocket'], // Start with polling, upgrade to websocket
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000 // Enables cookie-based authentication
  });
  
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });
  
  socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message);
  });
  
  socket.on('reconnect_attempt', (attempt) => {
    console.log(`Attempting reconnection: ${attempt}`);
  });

  
export default socket;
