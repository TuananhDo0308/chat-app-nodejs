import { prisma } from "../../prisma/client.js"

export async function getAllPermissions() {
    return prisma.permission.findMany()
}
export async function getPermissionById(id: string) {
    return prisma.permission.findUnique({ where: { id } })
}

export async function createPermission(permission: {
    name: string, description: string
}) {
    return prisma.permission.create({ data: permission })
}

export async function deletePermission(id: string) {
    return prisma.permission.delete({ where: { id } })
}

export async function updatePermission(id: string, permission: {
    name?: string, description?: string
}) {
    return prisma.permission.update({ where: { id }, data: permission })
}