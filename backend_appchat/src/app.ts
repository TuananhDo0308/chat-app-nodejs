import express from "express"
import cors from "cors"

import userRoutes from "./modules/users/users.route.js"
import authRoutes from "./modules/auth/auth.route.js"
import roleRoutes from "./modules/roles/role.route.js"
import rolePermissionRoutes from "./modules/rolePermission/rolePermission.route.js"
import permissionRoutes from "./modules/permissions/permissions.route.js"
import friendRoutes from "./modules/friends/friends.route.js"
import messageRoutes from "./modules/messages/messages.route.js"
import keyRoutes from "./modules/keys/keys.route.js"

import cookieParser from "cookie-parser"

import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";

const app = express()

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: {
    persistAuthorization: true,
  }
}));
app.get("/openapi.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

app.use(cookieParser())
app.use(express.json())
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true
}))

app.get("/", (req, res) => {
  return res.json({
    message: "Hello Express API",
    docs: {
      health: "GET /api/health",
      listUsers: "GET /api/users",
      createUser: "POST /api/users",
    },
  })
})


app.use("/api/users", userRoutes)
app.use("/api/auth", authRoutes)
app.use("/api/roles", roleRoutes)
app.use("/api/role-permissions", rolePermissionRoutes)
app.use("/api/permissions", permissionRoutes)
app.use("/api/friends", friendRoutes)
app.use("/api/messages", messageRoutes)
app.use("/api/keys", keyRoutes)

export default app
