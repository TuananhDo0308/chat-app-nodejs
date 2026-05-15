import type { Request, Response } from "express"
import * as rolePermissionService from "./rolePermission.service.js"

export async function getRolePermissions(req: Request, res: Response) {
    try {
        const result = await rolePermissionService.getAllRolePermissions()
        return res.json(result)
    } catch (error) {
        return res.status(500).json({ message: "Failed to get role permissions" })
    }
}

export async function createRolePermission(req: Request, res: Response) {
    try {
        const result = await rolePermissionService.createRolePermission(req.body)
        return res.status(201).json(result)
    } catch (error) {
        return res.status(500).json({ message: "Failed to create role permission" })
    }
}

export async function deleteRolePermission(req: Request, res: Response) {
    try {
        const { roleId, permissionId } = req.body
        await rolePermissionService.deleteRolePermission(roleId, permissionId)
        return res.status(204).send()
    } catch (error) {
        return res.status(500).json({ message: "Failed to delete" })
    }
}

export async function getRolePermissionsByRoleId(req: Request, res: Response) {
    try {
        const result = await rolePermissionService.getRolePermissionByRoleId(req.params.roleId as string)
        return res.json(result)
    } catch (error) {
        return res.status(500).json({ message: "Error" })
    }
}