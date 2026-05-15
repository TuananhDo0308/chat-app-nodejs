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

// 🛡️ Socket Middleware: Xác thực JWT Token
io.use((socket, next) => {
  const token = socket.handshake.auth.token; 
  
  if (!token) {
    return next(new Error("No token provided"));
  }

  try {
    // Dùng chung SECRET và logic verify với Express
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    
    // Lưu thông tin user vào socket instance
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
  }



  // 📩 Xử lý gửi tin nhắn riêng (Private Message)
  socket.on("send_private_message", async (data: { senderId: string, receiverId: string, content: string }) => {
    try {
      // 1. Lưu vào Database trước
      const newMessage = await messagesService.sendMessage(data.senderId, data.receiverId, data.content);

      // 2. Gửi cho người nhận (chỉ gửi vào phòng của receiverId)
      io.to(data.receiverId).emit("receive_private_message", newMessage);

      // 3. Gửi ngược lại cho người gửi để xác nhận/cập nhật UI
      socket.emit("message_sent", newMessage);
      
      console.log(`✉️ Message from ${data.senderId} to ${data.receiverId}`);
    } catch (error: any) {
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
