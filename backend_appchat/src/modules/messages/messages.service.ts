import { FriendshipStatus } from "../../constants/friendship.js"
import { prisma } from "../../prisma/client.js"

export async function sendMessage(senderId: string, receiverId: string, content: string) {
    const [sender, receiver] = await Promise.all([
        prisma.user.findUnique({ where: { id: senderId } }),
        prisma.user.findUnique({ where: { id: receiverId } })
    ])
    if (!sender || !receiver) {
        throw new Error("User not found")
    }
    const isFriend = await prisma.friendship.findFirst({
        where: {
            OR: [
                { userId: senderId, friendId: receiverId },
                { userId: receiverId, friendId: senderId }
            ],
            status: FriendshipStatus.ACCEPTED
        }
    })
    if (!isFriend) {
        throw new Error("You are not friend with this user")
    }
    return prisma.chatMessage.create({
        data: {
            senderId,
            receiverId,
            content
        }
    })
}

export async function getMessagesByFriendId(userId: string, friendId: string) {
    return prisma.chatMessage.findMany({
        where: {
            OR: [
                { senderId: userId, receiverId: friendId },
                { senderId: friendId, receiverId: userId }
            ]
        },
        orderBy: { createdAt: "asc" }
    })
}


export async function getConversations(userId: string) {
    return prisma.chatMessage.findMany({
        where: {
            OR: [
                { senderId: userId },
                { receiverId: userId }
            ]
        },
        orderBy: { createdAt: "asc" }
    })
}

export async function updateMessage(messageId: string, content: string) {
    return prisma.chatMessage.update({
        where: { id: messageId },
        data: { content }
    })
}

export async function deleteMessage(messageId: string) {
    return prisma.chatMessage.delete({
        where: { id: messageId }
    })
}

export async function readMessage(messageId: string) {
    return prisma.chatMessage.update({
        where: { id: messageId },
        data: { isRead: true }
    })
}

export async function readAllMessage(userId: string, friendId: string) {
    return prisma.chatMessage.updateMany({
        where: {
            senderId: friendId,
            receiverId: userId,
            isRead: false
        },
        data: { isRead: true }
    })
}

// Returns last message per conversation partner (for sidebar preview)
export async function getConversationPreviews(userId: string) {
    const msgs = await prisma.chatMessage.findMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }] },
        orderBy: { createdAt: 'desc' },
        take: 500,
    })
    const seen = new Set<string>()
    const result: typeof msgs = []
    for (const m of msgs) {
        const partnerId = m.senderId === userId ? m.receiverId : m.senderId
        if (!seen.has(partnerId)) { seen.add(partnerId); result.push(m) }
    }
    return result
}
