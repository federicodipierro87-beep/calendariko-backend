import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTribalSoundGroup() {
  console.log('🔧 Starting Tribal Sound group fix...');
  
  const groupId = 'cmho8j9n50000ma37mrc4cit5';
  const groupName = 'tribal sound';
  
  try {
    // 1. Verifica se il gruppo esiste
    const existingGroup = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        user_groups: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true
              }
            }
          }
        }
      }
    });

    // Verifica eventi e disponibilità separatamente
    const groupEvents = await prisma.event.findMany({
      where: { group_id: groupId }
    });

    const groupAvailabilities = await prisma.availability.findMany({
      where: { group_id: groupId }
    });

    if (!existingGroup) {
      console.log('❌ Gruppo Tribal Sound non trovato');
      return;
    }

    console.log('🔍 Gruppo trovato:', {
      id: existingGroup.id,
      name: existingGroup.name,
      type: existingGroup.type,
      members: existingGroup.user_groups?.length || 0,
      events: groupEvents.length,
      availabilities: groupAvailabilities.length
    });

    // 2. Salva i membri per ricrearli dopo
    const membersToRestore = existingGroup.user_groups?.map((ug: any) => ({
      user_id: ug.user_id,
      user: ug.user
    })) || [];

    console.log('💾 Membri da ripristinare:', membersToRestore.map((m: any) => `${m.user.first_name} ${m.user.last_name}`));

    // 3. Elimina tutto quello collegato al gruppo
    console.log('🗑️ Eliminazione dati collegati...');
    
    // Elimina eventi
    if (groupEvents.length > 0) {
      console.log(`- Eliminazione ${groupEvents.length} eventi...`);
      await prisma.event.deleteMany({
        where: { group_id: groupId }
      });
    }

    // Elimina disponibilità
    if (groupAvailabilities.length > 0) {
      console.log(`- Eliminazione ${groupAvailabilities.length} disponibilità...`);
      await prisma.availability.deleteMany({
        where: { group_id: groupId }
      });
    }

    // Elimina relazioni user_groups
    if (existingGroup.user_groups && existingGroup.user_groups.length > 0) {
      console.log(`- Eliminazione ${existingGroup.user_groups.length} relazioni membri...`);
      await prisma.userGroup.deleteMany({
        where: { group_id: groupId }
      });
    }

    // 4. Elimina il gruppo
    console.log('🗑️ Eliminazione gruppo...');
    await prisma.group.delete({
      where: { id: groupId }
    });

    console.log('✅ Gruppo Tribal Sound eliminato con successo');

    // 5. Ricreo il gruppo pulito
    console.log('🆕 Ricreazione gruppo pulito...');
    const newGroup = await prisma.group.create({
      data: {
        name: 'Tribal Sound',  // Con maiuscola corretta
        type: 'BAND',
        genre: 'Commerciale',
        description: 'Gruppo commerciale rinnovato'
      }
    });

    console.log('✅ Nuovo gruppo creato:', {
      id: newGroup.id,
      name: newGroup.name,
      type: newGroup.type
    });

    // 6. Ripristino i membri
    console.log('👥 Ripristino membri...');
    for (const member of membersToRestore) {
      await prisma.userGroup.create({
        data: {
          user_id: member.user_id,
          group_id: newGroup.id
        }
      });
      console.log(`✅ Ripristinato membro: ${member.user.first_name} ${member.user.last_name}`);
    }

    console.log('🎉 Fix completato con successo!');
    console.log('📊 Nuovo gruppo:', {
      id: newGroup.id,
      name: newGroup.name,
      type: newGroup.type,
      members_restored: membersToRestore.length
    });

    return newGroup;

  } catch (error) {
    console.error('❌ Errore durante il fix:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  try {
    await fixTribalSoundGroup();
  } catch (error) {
    console.error('❌ Errore:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { fixTribalSoundGroup };