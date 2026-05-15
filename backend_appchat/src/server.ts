import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import dotenv from "dotenv";
import * as messagesService from "./modules/messages/messages.service.js";

dotenv.config();

const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);

import jwt from "jsonwebtoken";

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  },
});

// Track online users: userId → Set of socketIds
const onlineUsers = new Map<string, Set<string>>();

// 🛡️ Socket Middleware: Xác thực JWT Token
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    socket.data.userId = decoded.userId;
    socket.data.sessionId = decoded.sessionId;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.data.userId;

  if (userId) {
    socket.join(userId);
    console.log(`🛡️ Authenticated: ${userId}`);

    // Track online users
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Emit current online users list to this socket
    socket.emit("users_online", Array.from(onlineUsers.keys()));

    // Broadcast to others that this user is online
    socket.broadcast.emit("user_online", userId);
  }

  // 📩 Xử lý gửi tin nhắn riêng (Private Message)
  socket.on("send_private_message", async (data: { senderId: string; receiverId: string; content: string }) => {
    try {
      const newMessage = await messagesService.sendMessage(data.senderId, data.receiverId, data.content);

      // Send to receiver
      io.to(data.receiverId).emit("receive_private_message", newMessage);

      // Confirm to sender
      socket.emit("message_sent", newMessage);

      console.log(`✉️ Message from ${data.senderId} to ${data.receiverId}`);
    } catch (error: any) {
      socket.emit("error", { message: error.message });
    }
  });

  // Typing events
  socket.on("typing", (data: { receiverId: string }) => {
    io.to(data.receiverId).emit("typing", { senderId: userId });
  });

  socket.on("stop_typing", (data: { receiverId: string }) => {
    io.to(data.receiverId).emit("stop_typing", { senderId: userId });
  });

  // Mark read
  socket.on("mark_read", async (data: { friendId: string }) => {
    try {
      await messagesService.readAllMessage(userId, data.friendId);
      io.to(data.friendId).emit("messages_read", { readBy: userId });
    } catch (error: any) {
      console.error("mark_read error:", error.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);

    if (userId && onlineUsers.has(userId)) {
      const sockets = onlineUsers.get(userId)!;
      sockets.delete(socket.id);

      if (sockets.size === 0) {
        onlineUsers.delete(userId);
        socket.broadcast.emit("user_offline", userId);
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
