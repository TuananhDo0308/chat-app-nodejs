import { Router } from "express";
import * as userController from "./users.controller.js"
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { checkPermission } from "../../middlewares/permission.middleware.js";
import { PERMISSIONS } from "../../constants/permissions.js";
const router = Router()

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get("/", authMiddleware, checkPermission(PERMISSIONS.USER.READ), userController.getUsers)

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details
 */
router.get("/:id", authMiddleware, checkPermission(PERMISSIONS.USER.READ), userController.getUserById)

export default router