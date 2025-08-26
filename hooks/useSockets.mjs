// src/hooks/useSocket.js
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = "https://backend-l3s8.onrender.com"; // Ajusta según corresponda

const useSocket = (groupId) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL, {
      withCredentials: true,
    });
    setSocket(newSocket);

    // Al conectar, unirse a la sala del grupo
    newSocket.on('connect', () => {
      if (groupId) {
        newSocket.emit('joinGroup', groupId);
      }
    });

    // Limpieza al desmontar
    return () => newSocket.close();
  }, [groupId]);

  return socket;
};

export default useSocket;
