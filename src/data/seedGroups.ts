import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const seedGroups = async () => {
  try {
    // Crea gruppi di esempio
    const groups = await Promise.all([
      prisma.group.create({
        data: {
          name: 'Jazz Quartet Milano',
          type: 'BAND',
          description: 'Quartetto jazz specializzato in standard e composizioni originali',
          genre: 'Jazz',
          contact_email: 'info@jazzquartetmilano.com',
          contact_phone: '+39 333 123 4567'
        }
      }),
      prisma.group.create({
        data: {
          name: 'DJ Marco Electronic',
          type: 'DJ',
          description: 'DJ specializzato in musica elettronica e house',
          genre: 'Electronic',
          contact_email: 'marco@electronicbeats.com',
          contact_phone: '+39 334 567 8901'
        }
      }),
      prisma.group.create({
        data: {
          name: 'Sofia Vocal',
          type: 'SOLO',
          description: 'Cantante solista specializzata in pop e soul',
          genre: 'Pop/Soul',
          contact_email: 'sofia@sofiavocal.com',
          contact_phone: '+39 335 890 1234'
        }
      }),
      prisma.group.create({
        data: {
          name: 'Rock Band Thunder',
          type: 'BAND',
          description: 'Band rock con influenze blues e alternative',
          genre: 'Rock',
          contact_email: 'contact@thunderrock.com',
          contact_phone: '+39 336 234 5678'
        }
      }),
      prisma.group.create({
        data: {
          name: 'DJ Luna House',
          type: 'DJ',
          description: 'DJ specializzata in deep house e tech house',
          genre: 'House',
          contact_email: 'luna@housevibez.com',
          contact_phone: '+39 337 345 6789'
        }
      })
    ]);

    console.log('Gruppi creati con successo:', groups.length);
    return groups;
  } catch (error) {
    console.error('Errore nella creazione dei gruppi:', error);
    throw error;
  }
};

// Se il file viene eseguito direttamente, crea i gruppi
if (require.main === module) {
  seedGroups()
    .then(() => {
      console.log('Seeding completato');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Errore nel seeding:', error);
      process.exit(1);
    });
}