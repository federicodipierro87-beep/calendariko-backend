import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create some sample groups
  const groups = await Promise.all([
    prisma.group.create({
      data: {
        name: "The Jazz Collective",
        type: "BAND",
        genre: "Jazz",
        description: "A modern jazz ensemble",
        contact_email: "contact@jazzcollective.com"
      }
    }),
    prisma.group.create({
      data: {
        name: "Electronic Vibes",
        type: "DJ",
        genre: "Electronic",
        description: "Electronic music collective",
        contact_email: "info@electronicvibes.com"
      }
    }),
    prisma.group.create({
      data: {
        name: "Solo Artists",
        type: "SOLO",
        genre: "Various",
        description: "Individual artists showcase",
        contact_email: "solo@artists.com"
      }
    })
  ]);

  console.log(`✅ Created ${groups.length} groups`);

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@calendariko.com',
      password_hash: hashedPassword,
      first_name: 'Admin',
      last_name: 'User',
      role: 'ADMIN',
      phone: '+39 123 456 7890'
    }
  });

  console.log(`✅ Created admin user: ${adminUser.email}`);

  // Add admin to first group
  await prisma.userGroup.create({
    data: {
      user_id: adminUser.id,
      group_id: groups[0].id
    }
  });

  console.log(`✅ Added admin to group: ${groups[0].name}`);

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });