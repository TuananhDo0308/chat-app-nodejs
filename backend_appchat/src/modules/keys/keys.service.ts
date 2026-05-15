import { prisma } from "../../prisma/client.js"

// ─── Simple ECDH public key ───────────────────────────────────────────────────

export async function setPublicKey(userId: string, publicKey: string) {
  await prisma.userPublicKey.upsert({
    where: { userId },
    create: { userId, publicKey },
    update: { publicKey },
  })
}

export async function getPublicKey(userId: string): Promise<string | null> {
  const row = await prisma.userPublicKey.findUnique({ where: { userId } })
  return row?.publicKey ?? null
}

export async function hasPublicKey(userId: string): Promise<boolean> {
  const count = await prisma.userPublicKey.count({ where: { userId } })
  return count > 0
}
