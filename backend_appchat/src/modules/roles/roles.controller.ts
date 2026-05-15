import type { Request, Response } from "express";
import * as rolesService from "./roles.service.js";

export async function getAllRoles(req: Request, res: Response) {
  try {
    const roles = await rolesService.getAllRoles();
    return res.json({
      message: "Get all roles successfully",
      data: roles,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to get all roles",
    });
  }
}
export async function createRole(req: Request, res: Response) {
  try {
    const role = await rolesService.createRole(req.body);
    return res.json({
      message: "Create role successfully",
      data: role,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to create role",
    });
  }
}
export async function deleteRole(req: Request, res: Response) {
  try {
    const role = await rolesService.deleteRole(req.params.id as string);
    return res.json({
      message: "Delete role successfully",
      data: role,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to delete role",
    });
  }
}
export async function updateRole(req: Request, res: Response) {
  try {
    const role = await rolesService.updateRole(req.params.id as string, req.body);
    return res.json({
      message: "Update role successfully",
      data: role,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to update role",
    });
  }
}
export async function getRoleById(req: Request, res: Response) {
  try {
    const role = await rolesService.getRoleById(req.params.id as string);
    return res.json({
      message: "Get role successfully",
      data: role,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to get role",
    });
  }
}