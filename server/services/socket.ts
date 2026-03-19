import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";

let io: SocketIOServer;

export function initSocket(server: HttpServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // When a user logs in or connects, they emit "register" with their user ID
    socket.on("register", (userId: string) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    socket.on("join_booking", (bookingId: string) => {
      socket.join(`booking_${bookingId}`);
      console.log(`Socket ${socket.id} joined booking room ${bookingId}`);
    });

    socket.on("leave_booking", (bookingId: string) => {
      socket.leave(`booking_${bookingId}`);
      console.log(`Socket ${socket.id} left booking room ${bookingId}`);
    });

    socket.on("disconnect", () => {
      console.log(`Socket ${socket.id} disconnected`);
    });
  });
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

export function notifyUser(userId: string, event: string, data: any) {
  if (!io) return;
  io.to(`user_${userId}`).emit(event, data);
}

export function notifyBookingRoom(bookingId: string, event: string, data?: any) {
  if (!io) return;
  io.to(`booking_${bookingId}`).emit(event, data);
}

export function broadcast(event: string, data: any) {
  if (!io) return;
  io.emit(event, data);
}
