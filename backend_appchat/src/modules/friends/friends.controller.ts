import type { Request, Response } from "express"
import * as friendsService from "./friends.service.js"

export async function getFriendsByUserId(req: Request, res: Response) {
    const userId = (req as any).user.id; // Lấy từ token đăng nhập
    const friendships = await friendsService.getFriendsByUserId(userId)
    
    const friends = friendships.map(f => f.userId === userId ? f.friend : f.user);
    return res.json({ success: true, data: friends });
}

export async function getPendingRequests(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const requests = await friendsService.getPendingRequests(userId);
    return res.json({ success: true, data: requests });
}

export async function addFriend(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { friendId } = req.body; // Gửi friendId trong body
    const friend = await friendsService.addFriend(userId, friendId);
    return res.json({ success: true, data: friend });
}

export async function patchFriendResponse(req: Request, res: Response) {
    const { requesterId, status } = req.body;
    const userId = (req as any).user.id; // current user là người nhận lời mời
    const friend = await friendsService.patchFriendResponse(requesterId, userId, status);
    return res.json({ success: true, data: friend });
}

export async function deleteFriend(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { friendId } = req.params;
    await friendsService.deleteFriend(userId, friendId as string);
    return res.json({ success: true, message: "Friend deleted successfully" });
}

