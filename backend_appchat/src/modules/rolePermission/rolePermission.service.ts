import { prisma } from "../../prisma/client.js"

export async function createRolePermission(rolePermission: {
    roleId: string,
    permissionId: string
}) {
    return prisma.rolePermission.create({
        data: rolePermission
    })
}

export async function getAllRolePermissions() {
    return prisma.rolePermission.findMany({
        include: {
            role: true,
            permission: true
        }
    })
}

export async function deleteRolePermission(roleId: string, permissionId: string) {
    return prisma.rolePermission.delete({
        where: { roleId_permissionId: { roleId, permissionId } }
    })
}

export async function getRolePermissionByRoleId(roleId: string) {
    return prisma.rolePermission.findMany({
        where: { roleId }
    })
}

export async function getRolePermissionByPermissionId(permissionId: string) {
    return prisma.rolePermission.findMany({
        where: { permissionId }
    })
}
