import type { Request, Response } from "express"
import * as permissionsService from "./permissions.service.js"

export async function getAllPermissions(req: Request, res: Response) {
    try {
        const permissions = await permissionsService.getAllPermissions()
        return res.json(permissions)
    } catch (error) {
        return res.status(500).json({ message: "Failed to get permissions" })
    }
}

export async function getPermissionById(req: Request, res: Response) {
    try {
        const permission = await permissionsService.getPermissionById(req.params.id as string)
        if (!permission) return res.status(404).json({ message: "Permission not found" })
        return res.json(permission)
    } catch (error) {
        return res.status(500).json({ message: "Failed to get permission" })
    }
}

export async function createPermission(req: Request, res: Response) {
    try {
        const permission = await permissionsService.createPermission(req.body)
        return res.status(201).json(permission)
    } catch (error) {
        return res.status(500).json({ message: "Failed to create permission" })
    }
}

export async function deletePermission(req: Request, res: Response) {
    try {
        await permissionsService.deletePermission(req.params.id as string)
        return res.status(204).send()
    } catch (error) {
        return res.status(500).json({ message: "Failed to delete permission" })
    }
}

export async function updatePermission(req: Request, res: Response) {
    try {
        const permission = await permissionsService.updatePermission(req.params.id as string, req.body)
        return res.json(permission)
    } catch (error) {
        return res.status(500).json({ message: "Failed to update permission" })
    }
}