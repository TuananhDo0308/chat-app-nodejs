import { prisma } from "../../prisma/client.js"

export async function getAllRoles() {
    const roles = await prisma.role.findMany()
    return roles
}
    
export async function createRole(roleData: { name: string, description?: string }) {
    const role = await prisma.role.create({
        data: roleData
    })
    return role
}
    
export async function deleteRole(roleId: string) {
    const role = await prisma.role.delete({
        where: {
            id: roleId
        }
    })
    return role
}
    
export async function updateRole(roleId: string, roleData: { name?: string, description?: string }) {
    const role = await prisma.role.update({
        where: {
            id: roleId
        },
        data: roleData
    })
    return role
}   
export async function getRoleById(roleId: string) {
    const role = await prisma.role.findUnique({
        where: {
            id: roleId
        }
    })
    return role
}