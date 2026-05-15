import type { Response } from "express"
import * as friendsService from "./friends.service.js"
import { sendResponse, sendError } from "../../utils/response.js"
import type { AuthRequest } from "../../middlewares/auth.middleware.js"

export async function getFriendsByUserId(req: AuthRequest, res: Response) {
    const userId = req.user!.userId;
    const friendships = await friendsService.getFriendsByUserId(userId)
    const friends = friendships.map(f => f.userId === userId ? f.friend : f.user);
    return sendResponse(res, 200, "Get friends successfully", friends);
}

export async function getPendingRequests(req: AuthRequest, res: Response) {
    const userId = req.user!.userId;
    const requests = await friendsService.getPendingRequests(userId);
    return sendResponse(res, 200, "Get pending requests successfully", requests);
}

export async function getSentRequests(req: AuthRequest, res: Response) {
    const userId = req.user!.userId;
    const requests = await friendsService.getSentRequests(userId);
    return sendResponse(res, 200, "Get sent requests successfully", requests);
}

export async function addFriend(req: AuthRequest, res: Response) {
    const userId = req.user!.userId;
    const { friendId } = req.body;
    if (!friendId) {
        return sendError(res, 400, "friendId is required");
    }
    try {
        const friendship = await friendsService.addFriend(userId, friendId);
        return sendResponse(res, 201, "Friend request sent", friendship);
    } catch (err: any) {
        return sendError(res, 400, err.message || "Failed to send friend request");
    }
}

export async function patchFriendResponse(req: AuthRequest, res: Response) {
    const userId = req.user!.userId;
    const { requesterId, status } = req.body;
    if (!requesterId || !status) {
        return sendError(res, 400, "requesterId and status are required");
    }
    try {
        const friendship = await friendsService.patchFriendResponse(requesterId, userId, status);
        return sendResponse(res, 200, "Friend request updated", friendship);
    } catch (err: any) {
        return sendError(res, 400, err.message || "Failed to update friend request");
    }
}

export async function deleteFriend(req: AuthRequest, res: Response) {
    const userId = req.user!.userId;
    const { friendId } = req.params;
    try {
        await friendsService.deleteFriend(userId, friendId as string);
        return sendResponse(res, 200, "Friend deleted successfully", null);
    } catch (err: any) {
        return sendError(res, 400, err.message || "Failed to delete friend");
    }
}
