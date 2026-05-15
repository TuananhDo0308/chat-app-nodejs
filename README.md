# 🚀 Real-Time Chat Application with RBAC

A robust real-time chat application featuring granular Role-Based Access Control (RBAC), secure authentication, and a friend management system.

## 📂 Project Structure

The project is divided into two main modules:

*   **`backend_appchat`**: Powered by Node.js, Express, Prisma (PostgreSQL), and Socket.io.
*   **`frontend_appchat`**: A High-Performance Single Page Application (SPA) built with Vite and Vanilla JavaScript, featuring a premium custom UI.

---

## ✨ Key Features

### 💬 Real-time Messaging
*   **Private 1-1 Chat**: Low-latency communication powered by Socket.io.
*   **Private Rooms**: Isolated communication channels ensuring message privacy.
*   **Message Persistence**: All conversations are stored in PostgreSQL for historical retrieval.

### 👥 Social & Friend System
*   **Friend Requests**: Send, receive, and manage requests (Pending/Accepted/Rejected).
*   **Friend List**: Real-time view of connected friends.
*   **User Discovery**: Explore and search for new users within the platform.

### 🛡️ Role-Based Access Control (RBAC)
*   **Granular Permissions**: Fine-grained control over every action (Create, Read, Update, Delete).
*   **Flexible Roles**: Pre-configured ADMIN and USER roles with easy-to-extend capabilities.
*   **Dynamic Middleware**: High-performance permission checking on every API request.

### 🔐 Security & Session Management
*   **JWT Authentication**: Secure login using Access and Refresh tokens.
*   **Multi-Device Sessions**: Track and manage active sessions across different devices (AuthSession).
*   **Socket Security**: JWT-based authentication for real-time connections.

---

## 🛠️ Technology Stack

| Component | Technologies |
| :--- | :--- |
| **Backend** | Node.js, Express, TypeScript, Prisma (ORM), PostgreSQL, Socket.io, Swagger (OpenAPI 3.0), Argon2 (Hashing) |
| **Frontend** | Vite, JavaScript (ES6+), Vanilla CSS (Custom Design System), Socket.io-client, Navigo (Router) |

---

## 🚀 Getting Started

### 1. Backend Setup
```bash
cd backend_appchat
npm install

# Configure your .env file with DATABASE_URL and JWT_SECRET
npx prisma migrate dev --name init
npx tsx src/prisma/seed.ts  # Initialize permissions and admin/user accounts
npm run dev
```
*API Documentation will be available at: `http://localhost:3000/api-docs`*

### 2. Frontend Setup
```bash
cd frontend_appchat
npm install

# Configure .env with VITE_API_BASE_URL=http://localhost:3000/api
npm run dev
```
*The app will be running at: `http://localhost:5173`*

---

## 📝 API Documentation
The system exposes a full **Swagger/OpenAPI 3.0** documentation. You can explore all endpoints (Auth, Users, Friends, Messages, Roles, etc.) at the `/api-docs` route after starting the backend.

---

## 🤝 Contributing
Developed with ❤️ by **TuananhDo**. Contributions, issues, and feature requests are welcome!

---

⭐ **Star this repository if you find it helpful!**
