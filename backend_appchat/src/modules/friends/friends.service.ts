import { FriendshipStatus } from "../../lib/generated/prisma/enums.js";
import { prisma } from "../../prisma/client.js";

export async function addFriend(userId: string, friendId: string) {
    return prisma.friendship.create({
        data: {
            userId,
            friendId,
            status: FriendshipStatus.PENDING
        }
    })
}

export async function getFriendsByUserId(userId: string) {
    // Lấy tất cả mối quan hệ đã ACCEPTED mà user này tham gia (với tư cách người gửi hoặc nhận)
    return prisma.friendship.findMany({
        where: {
            OR: [
                { userId: userId, status: FriendshipStatus.ACCEPTED },
                { friendId: userId, status: FriendshipStatus.ACCEPTED }
            ]
        },
        include: {
            user: true,   // Người gửi
            friend: true  // Người nhận
        }
    })
}

export async function getPendingRequests(userId: string) {
    // Lấy các yêu cầu kết bạn đang gửi ĐẾN user này
    return prisma.friendship.findMany({
        where: { friendId: userId, status: FriendshipStatus.PENDING },
        include: { user: true }
    })
}

export async function patchFriendResponse(userId: string, friendId: string, status: FriendshipStatus) {
    return prisma.friendship.update({
        where: { userId_friendId: { userId, friendId } },
        data: { status }
    })
}

export async function getSentRequests(userId: string) {
    return prisma.friendship.findMany({
        where: { userId, status: FriendshipStatus.PENDING },
        include: { friend: true }
    })
}

export async function deleteFriend(userId: string, friendId: string) {
    return prisma.friendship.delete({
        where: {
            userId_friendId: { userId, friendId }
        }
    })
}