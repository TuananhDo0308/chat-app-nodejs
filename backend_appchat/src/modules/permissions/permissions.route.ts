import { Router } from "express"
import * as permissionsController from "./permissions.controller.js"

import { authMiddleware } from "../../middlewares/auth.middleware.js"
import { checkPermission } from "../../middlewares/permission.middleware.js"
import { PERMISSIONS } from "../../constants/permissions.js"

const router = Router()

// Ai đăng nhập cũng xem được danh sách
/**
 * @openapi
 * /api/permissions:
 *   get:
 *     tags: [Permissions]
 *     summary: Get all permissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of permissions
 *   post:
 *     tags: [Permissions]
 *     summary: Create a new permission
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Permission created
 */
router.get("/", authMiddleware, checkPermission(PERMISSIONS.PERMISSION.READ), permissionsController.getAllPermissions)

/**
 * @openapi
 * /api/permissions/{id}:
 *   get:
 *     tags: [Permissions]
 *     summary: Get permission by ID
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
 *         description: Permission details
 *   patch:
 *     tags: [Permissions]
 *     summary: Update a permission
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Permission updated
 *   delete:
 *     tags: [Permissions]
 *     summary: Delete a permission
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Permission deleted
 */
router.get("/:id", authMiddleware, checkPermission(PERMISSIONS.PERMISSION.READ), permissionsController.getPermissionById)
router.post("/", authMiddleware, checkPermission(PERMISSIONS.PERMISSION.CREATE), permissionsController.createPermission)
router.delete("/:id", authMiddleware, checkPermission(PERMISSIONS.PERMISSION.DELETE), permissionsController.deletePermission)
router.patch("/:id", authMiddleware, checkPermission(PERMISSIONS.PERMISSION.UPDATE), permissionsController.updatePermission)

export default router