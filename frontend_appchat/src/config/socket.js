import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

let socket;

export const getSocket = (token) => {
  if (!socket && token) {
    socket = io(SOCKET_URL, {
      auth: { token }, // Gửi token lên để xác thực
      withCredentials: true,
      autoConnect: true
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
