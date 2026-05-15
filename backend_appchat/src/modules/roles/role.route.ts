import { Router } from "express";
import * as roleController from "./roles.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { checkPermission } from "../../middlewares/permission.middleware.js";
import { PERMISSIONS } from "../../constants/permissions.js";

const router = Router();

/**
 * @openapi
 * /api/roles:
 *   get:
 *     tags: [Roles]
 *     summary: Get all roles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 *   post:
 *     tags: [Roles]
 *     summary: Create a new role
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
 *         description: Role created
 */
router.get("/",authMiddleware, checkPermission(PERMISSIONS.ROLE.READ), roleController.getAllRoles);
router.post("/",authMiddleware, checkPermission(PERMISSIONS.ROLE.CREATE), roleController.createRole);

/**
 * @openapi
 * /api/roles/{id}:
 *   get:
 *     tags: [Roles]
 *     summary: Get role by ID
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
 *         description: Role details
 *   put:
 *     tags: [Roles]
 *     summary: Update a role
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
 *         description: Role updated
 *   delete:
 *     tags: [Roles]
 *     summary: Delete a role
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
 *         description: Role deleted
 */
router.delete("/:id",authMiddleware, checkPermission(PERMISSIONS.ROLE.DELETE), roleController.deleteRole);
router.put("/:id",authMiddleware, checkPermission(PERMISSIONS.ROLE.UPDATE), roleController.updateRole);
router.get("/:id",authMiddleware, checkPermission(PERMISSIONS.ROLE.READ), roleController.getRoleById);

export default router;
