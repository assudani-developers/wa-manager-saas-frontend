import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://wa-kapil.piyushassudani.in");

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("🔌 Connected to WebSocket server");
    });

    socket.on("disconnect", () => {
      console.log("🔌 Disconnected from WebSocket server");
    });

    socket.on("connect_error", (err) => {
      console.warn("⚠️ WebSocket connection error:", err.message);
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
