import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SERVER_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

const socket = io(URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

socket.on('connect', () => {
  console.log('Свързан към сървъра:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Изключен от сървъра');
});

export default socket;
