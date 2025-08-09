#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupPhantomGroups() {
  console.log('🧹 Starting phantom groups cleanup...')

  try {
    // Find groups with 0 members
    const phantomGroups = await prisma.group.findMany({
      include: {
        _count: {
          select: { members: true }
        },
        members: true
      },
      where: {
        members: {
          none: {}
        }
      }
    })

    console.log(`📊 Found ${phantomGroups.length} phantom groups (groups with 0 members)`)

    if (phantomGroups.length === 0) {
      console.log('✅ No phantom groups to clean up!')
      return
    }

    // Show details about phantom groups
    console.log('\nPhantom groups to be deleted:')
    phantomGroups.forEach((group, index) => {
      console.log(`${index + 1}. ${group.name} (ID: ${group.groupId.substring(0, 20)}...)`)
    })

    // Delete phantom groups
    const deleteResult = await prisma.group.deleteMany({
      where: {
        id: {
          in: phantomGroups.map(g => g.id)
        }
      }
    })

    console.log(`\n🗑️  Deleted ${deleteResult.count} phantom groups`)

    // Show remaining groups
    const remainingGroups = await prisma.group.findMany({
      include: {
        _count: {
          select: { members: true }
        }
      }
    })

    console.log(`\n📊 Remaining groups: ${remainingGroups.length}`)
    remainingGroups.forEach((group, index) => {
      console.log(`${index + 1}. ${group.name} (${group._count.members} members)`)
    })

    console.log('\n✅ Phantom groups cleanup completed!')

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
cleanupPhantomGroups()
  .catch((error) => {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  })