import { prisma } from "./client.js";
import { PERMISSIONS } from "../constants/permissions.js";

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Tạo Roles
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN", description: "Full system access" },
  });

  const userRole = await prisma.role.upsert({
    where: { name: "USER" },
    update: {},
    create: { name: "USER", description: "Regular user access" },
  });

  // 2. Gom tất cả permissions từ hằng số vào 1 mảng để tạo
  const allPermissionNames = [
    ...Object.values(PERMISSIONS.USER),
    ...Object.values(PERMISSIONS.ROLE),
    ...Object.values(PERMISSIONS.PERMISSION),
    ...Object.values(PERMISSIONS.FRIEND),
    ...Object.values(PERMISSIONS.MESSAGE),
  ];

  console.log(`Creating ${allPermissionNames.length} permissions...`);

  const permissionRecords = await Promise.all(
    allPermissionNames.map((name) =>
      prisma.permission.upsert({
        where: { name },
        update: {},
        create: { name, description: `Permission to ${name.replace("_", " ").toLowerCase()}` },
      })
    )
  );

  // 3. Gán TOÀN BỘ quyền cho ADMIN
  console.log("Assigning all permissions to ADMIN...");
  for (const perm of permissionRecords) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // 4. Gán một số quyền hạn chế cho USER (Ví dụ chỉ cho READ)
  console.log("Assigning limited permissions to USER...");
  const userPermNames = [
    ...Object.values(PERMISSIONS.USER),
    ...Object.values(PERMISSIONS.ROLE),
    ...Object.values(PERMISSIONS.PERMISSION),
    ...Object.values(PERMISSIONS.FRIEND),
    ...Object.values(PERMISSIONS.MESSAGE),
  ];

  for (const perm of permissionRecords) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: userRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: userRole.id, permissionId: perm.id },
    });
  }

  console.log("✅ Seed finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
