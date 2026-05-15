import type { Request, Response } from "express"
import * as userService from "./users.service.js"
import { sendError, sendResponse } from "../../utils/response.js"
export async function getUsers(req: Request, res: Response) {
    try {
        const users = await userService.getUsers()
        return sendResponse(res, 200, "Users fetched successfully", users)
    } catch (error) {
        console.error(error)
        return sendError(res, 500, "Failed to get users")
    }
}
export async function getUserById(req: Request, res: Response) {
    try {
        const user = await userService.getUserById(req.params.id as string)
        return sendResponse(res, 200, "User fetched successfully", user)
    } catch (error) {
        console.error(error)
        return sendError(res, 500, "Failed to get user", error)
    }
}
