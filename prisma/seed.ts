import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { di: "seed-user-1" },
    create: {
      di: "seed-user-1",
      birthYear: 1990,
      gender: "MALE",
    },
    update: {},
  });

  const words = [
    { text: "트럼프", connections: ["미국", "대통령", "전쟁", "관세", "제멋대로"] },
    { text: "김정은", connections: ["북한", "미사일", "핵무기", "무서움"] },
  ];

  for (const entry of words) {
    const center = await prisma.word.upsert({
      where: { normalizedText: entry.text.toLowerCase() },
      create: {
        text: entry.text,
        normalizedText: entry.text.toLowerCase(),
        createdById: user.id,
        empathyCount: Math.floor(Math.random() * 500) + 100,
      },
      update: {},
    });

    for (const targetText of entry.connections) {
      const target = await prisma.word.upsert({
        where: { normalizedText: targetText.toLowerCase() },
        create: {
          text: targetText,
          normalizedText: targetText.toLowerCase(),
          createdById: user.id,
          empathyCount: Math.floor(Math.random() * 200),
        },
        update: {},
      });

      await prisma.wordConnection.upsert({
        where: {
          sourceWordId_targetWordId_userId: {
            sourceWordId: center.id,
            targetWordId: target.id,
            userId: user.id,
          },
        },
        create: {
          sourceWordId: center.id,
          targetWordId: target.id,
          userId: user.id,
          empathyCount: Math.floor(Math.random() * 300) + 50,
        },
        update: {},
      });
    }
  }

  console.log("Seed completed.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
