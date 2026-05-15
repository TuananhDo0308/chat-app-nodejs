import { Router } from "express";
import * as rolePermissionController from "./rolePermission.controller.js"
const router = Router()

/**
 * @openapi
 * /api/role-permissions:
 *   get:
 *     tags: [Role Permissions]
 *     summary: Get all role-permission assignments
 *     responses:
 *       200:
 *         description: List of role-permissions
 *   post:
 *     tags: [Role Permissions]
 *     summary: Assign a permission to a role
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roleId, permissionId]
 *             properties:
 *               roleId: { type: string }
 *               permissionId: { type: string }
 *     responses:
 *       201:
 *         description: Assigned successfully
 */
router.get("/",rolePermissionController.getRolePermissions)
router.post("/",rolePermissionController.createRolePermission)

/**
 * @openapi
 * /api/role-permissions/{roleId}/{permissionId}:
 *   delete:
 *     tags: [Role Permissions]
 *     summary: Remove a permission from a role
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: permissionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Removed successfully
 */
router.delete("/:roleId/:permissionId",rolePermissionController.deleteRolePermission)

/**
 * @openapi
 * /api/role-permissions/{roleId}:
 *   get:
 *     tags: [Role Permissions]
 *     summary: Get permissions assigned to a specific role
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of permissions for the role
 */
router.get("/:roleId",rolePermissionController.getRolePermissionsByRoleId)

export default router