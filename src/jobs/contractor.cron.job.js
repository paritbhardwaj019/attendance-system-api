const cron = require('node-cron');
const db = require('../database/prisma');
const cameraService = require('../services/camera.service.js');

cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Running daily cron job to delete face pictures...');

    const labours = await db.labour.findMany({
      select: {
        employeeNo: true,
      },
    });

    for (const labour of labours) {
      try {
        await cameraService.deleteFacePictureFromCamera(labour.employeeNo);
        console.log(`Deleted face pictures for labour: ${labour.employeeNo}`);
      } catch (error) {
        console.error(`Failed to delete face pictures for labour: ${labour.employeeNo}`, error);
      }
    }

    console.log('Daily face picture deletion completed.');
  } catch (error) {
    console.error('Error in daily cron job:', error);
  }
});

console.log('Cron job scheduled to run daily at midnight.');
