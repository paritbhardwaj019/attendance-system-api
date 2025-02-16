const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backupAttendanceData() {
  try {
    const labours = await prisma.labour.findMany({
      select: {
        id: true,
        fingerprint_data: true,
        aadhar_number: true,
        employeeNo: true,
        createdById: true,
        updatedById: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            mobile_number: true,
            roleId: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            password: true,
          },
        },
        contractor: {
          select: {
            id: true,
            firm_name: true,
            employeeNo: true,
            managerId: true,
            aadhar_number: true,
            startDate: true,
            endDate: true,
            siteCode: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                mobile_number: true,
                roleId: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                password: true,
              },
            },
          },
        },
        photos: {
          select: {
            id: true,
            url: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        pdfs: {
          select: {
            id: true,
            url: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        attendance: {
          select: {
            id: true,
            inTime: true,
            outTime: true,
            workingHours: true,
            date: true,
            createdAt: true,
            updatedAt: true,
          },
        },
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
