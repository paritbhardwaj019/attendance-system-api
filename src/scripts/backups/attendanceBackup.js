const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backupAttendanceData() {
  try {
    const labours = await prisma.labour.findMany({
      include: {
        user: true,
        contractor: {
          include: {
            user: true,
          },
        },
        photos: true,
        pdfs: true,
        attendance: true,
      },
    });

    const backupData = {
      timestamp: new Date().toISOString(),
      labours: labours,
    };

    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const fileName = `attendance_backup_${new Date().toISOString().replace(/:/g, '-')}.json`;
    fs.writeFileSync(path.join(backupDir, fileName), JSON.stringify(backupData, null, 2));

    console.log(`Backup created successfully: ${fileName}`);
  } catch (error) {
    console.error('Backup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backupAttendanceData();
