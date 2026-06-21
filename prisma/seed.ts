import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function clampSeedScore(total: number) {
  return Math.max(-10, Math.min(10, total));
}

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
    const centerScore = Math.floor(Math.random() * 121) - 40;
    const center = await prisma.word.upsert({
      where: { normalizedText: entry.text.toLowerCase() },
      create: {
        text: entry.text,
        normalizedText: entry.text.toLowerCase(),
        createdById: user.id,
        empathyCount: centerScore,
      },
      update: { empathyCount: centerScore },
    });

    await prisma.empathy.upsert({
      where: {
        userId_targetType_targetId: {
          userId: user.id,
          targetType: "WORD",
          targetId: center.id,
        },
      },
      create: {
        userId: user.id,
        targetType: "WORD",
        targetId: center.id,
        score: clampSeedScore(centerScore),
      },
      update: { score: clampSeedScore(centerScore) },
    });

    for (const targetText of entry.connections) {
      const targetScore = Math.floor(Math.random() * 81) - 30;
      const target = await prisma.word.upsert({
        where: { normalizedText: targetText.toLowerCase() },
        create: {
          text: targetText,
          normalizedText: targetText.toLowerCase(),
          createdById: user.id,
          empathyCount: targetScore,
        },
        update: { empathyCount: targetScore },
      });

      const linkScore = Math.floor(Math.random() * 61) - 20;
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
          empathyCount: linkScore,
        },
        update: { empathyCount: linkScore },
      });
    }
  }

  console.log("Seed completed.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
