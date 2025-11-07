import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDuplicateGroups() {
  console.log('🔍 Starting duplicate cleanup...');
  
  // Get all groups
  const allGroups = await prisma.group.findMany();
  console.log(`🔍 Found ${allGroups.length} total groups`);
  
  // Find unique groups by name and type
  const uniqueGroups = new Map();
  const duplicateIds = [];
  
  for (const group of allGroups) {
    const key = `${group.name}-${group.type}-${group.genre || ''}`;
    
    if (uniqueGroups.has(key)) {
      // This is a duplicate
      duplicateIds.push(group.id);
      console.log(`🗑️ Found duplicate: ${group.name} (${group.type}) - ID: ${group.id}`);
    } else {
      // Keep the first one
      uniqueGroups.set(key, group);
      console.log(`✅ Keeping: ${group.name} (${group.type}) - ID: ${group.id}`);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`- Unique groups: ${uniqueGroups.size}`);
  console.log(`- Duplicates to remove: ${duplicateIds.length}`);
  
  if (duplicateIds.length > 0) {
    console.log('\n🗑️ Removing duplicates...');
    
    // First, remove related records
    for (const groupId of duplicateIds) {
      // Remove user_groups relationships
      await prisma.userGroup.deleteMany({
        where: { group_id: groupId }
      });
      
      // Remove events (or update them to point to the kept group)
      await prisma.event.deleteMany({
        where: { group_id: groupId }
      });
      
      // Remove availability records
      await prisma.availability.deleteMany({
        where: { group_id: groupId }
      });
    }
    
    // Then remove the duplicate groups
    await prisma.group.deleteMany({
      where: {
        id: {
          in: duplicateIds
        }
      }
    });
    
    console.log(`✅ Removed ${duplicateIds.length} duplicate groups and related records`);
  }
  
  // Verify final count
  const finalCount = await prisma.group.count();
  console.log(`\n🎉 Final count: ${finalCount} unique groups`);
}

async function main() {
  try {
    await cleanDuplicateGroups();
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { cleanDuplicateGroups };