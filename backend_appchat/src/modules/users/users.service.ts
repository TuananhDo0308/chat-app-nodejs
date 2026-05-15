import { prisma } from "../../prisma/client.js";

export async function getUsers() {
    return prisma.user.findMany({
        include: {
            roles: {
                include: {
                    role: {
                        include: {
                            permissions: {
                                include: {
                                    permission:true
                                }
                            }
                        }
                    }
                }
            }
        }
    })
}
export async function getUserById(id: string) {
    return prisma.user.findUnique({ where: { id } })
}
