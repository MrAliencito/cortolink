import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.link.createMany({
    data: [
      { slug: 'hola', urlOriginal: 'https://www.prisma.io/' },
      { slug: 'gh',   urlOriginal: 'https://github.com/' }
    ],
    skipDuplicates: true
  })
  console.log('Semilla creada')
}

main().catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
