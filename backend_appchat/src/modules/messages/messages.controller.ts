import type { Request, Response } from "express"
import * as messagesService from "./messages.service.js"
import { sendResponse } from "../../utils/response.js"

export async function sendMessage(req: Request, res: Response) {
    const { senderId, receiverId, content } = req.body
    const message = await messagesService.sendMessage(senderId, receiverId, content)
    return res.json(message)
}

export async function getMessagesByFriendId(req: Request, res: Response) {
    const { userId, friendId } = req.params
    const messages = await messagesService.getMessagesByFriendId(userId as string, friendId as string)
    return sendResponse(res, 200, "Get messages successfully", messages)
}

export async function getConversations(req: Request, res: Response) {
    const { userId } = req.params
    const conversations = await messagesService.getConversations(userId as string)
    return res.json(conversations)
}

export async function updateMessage(req: Request, res: Response) {
    const { messageId, content } = req.body
    const message = await messagesService.updateMessage(messageId, content)
    return res.json(message)
}

export async function deleteMessage(req: Request, res: Response) {
    const { messageId } = req.params
    await messagesService.deleteMessage(messageId as string)
    return res.json({ message: "Message deleted successfully" })
}

export async function readMessage(req: Request, res: Response) {
    const { messageId } = req.params
    const message = await messagesService.readMessage(messageId as string)
    return res.json(message)
}

export async function readAllMessage(req: Request, res: Response) {
    const { userId, friendId } = req.params
    await messagesService.readAllMessage(userId as string, friendId as string)
    return res.json({ message: "All messages read successfully" })
}