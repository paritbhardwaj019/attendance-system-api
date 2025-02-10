const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.attendance.deleteMany({});

  // Delete photos and PDFs as they depend on Labour and Contractor
  await prisma.labourPhoto.deleteMany({});
  await prisma.labourPDF.deleteMany({});
  await prisma.contractorPhoto.deleteMany({});
  await prisma.contractorPDF.deleteMany({});

  // Delete visitor related entries
  await prisma.visitorEntry.deleteMany({});
  await prisma.visitorPhoto.deleteMany({});
  await prisma.visitor.deleteMany({});

  // Delete user type models
  await prisma.labour.deleteMany({});
  await prisma.contractor.deleteMany({});
  await prisma.manager.deleteMany({});
  await prisma.admin.deleteMany({});

  // Delete visitor signup
  await prisma.visitorSignup.deleteMany({});

  // Delete system codes before user
  // await prisma.systemCode.deleteMany({});

  // Finally delete users
  await prisma.user.deleteMany({});

  // Delete remaining independent tables
  // await prisma.role.deleteMany({});
  await prisma.plant.deleteMany({});

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'MANAGER' },
    update: {},
    create: { name: 'MANAGER' },
  });

  const labourRole = await prisma.role.upsert({
    where: { name: 'LABOUR' },
    update: {},
    create: { name: 'LABOUR' },
  });

  const contractorRole = await prisma.role.upsert({
    where: { name: 'CONTRACTOR' },
    update: {},
    create: { name: 'CONTRACTOR' },
  });

  // Create Users
  const rajeshSharmaUser = await prisma.user.create({
    data: {
      name: 'Rajesh Sharma',
      username: 'rajesh_sharma_123',
      password: '$2a$10$UwrcztDTc2QfMD.UEe69eOvoPgB.sIXA6y3OFFGcqjhNbw48ZCyLa',
      mobile_number: '+919876543210',
      roleId: contractorRole.id,
    },
  });

  const visAUser = await prisma.user.create({
    data: {
      name: 'Vis A',
      username: 'vis_a',
      password: '$2a$10$FgDKpUrDYptLU720HiEFh.KBaEnF4XhbmdsyUfmivNdLGdftiIDbm',
      mobile_number: '1111111111',
      roleId: labourRole.id,
    },
  });

  const visBUser = await prisma.user.create({
    data: {
      name: 'Vis B',
      username: 'vis_b',
      password: '$2a$10$2TSIU33opcvg4hDwPqIl7OmFkXMINfrZT3LEbUg3gcwdq7qVxuZ36',
      mobile_number: '2222222222',
      roleId: labourRole.id,
    },
  });

  const visCUser = await prisma.user.create({
    data: {
      name: 'Vis C',
      username: 'vis_c',
      password: '$2a$10$1B01iZzK5z7lzcGF7jSLX.1vmyMqpIASB7Qc5Msc3UX.2FoK1Ze1C',
      mobile_number: '3333333333',
      roleId: labourRole.id,
    },
  });

  // Create Contractor
  const sharmaBuildersContractor = await prisma.contractor.create({
    data: {
      user: { connect: { id: rajeshSharmaUser.id } },
      firm_name: 'Sharma Builders Pvt. Ltd.',
      employeeNo: 'CON01',
      aadhar_number: '123456789012',
      createdBy: { connect: { id: rajeshSharmaUser.id } },
      updatedBy: { connect: { id: rajeshSharmaUser.id } },
    },
  });

  // Create Labours
  const visALabour = await prisma.labour.create({
    data: {
      user: { connect: { id: visAUser.id } },
      contractor: { connect: { id: sharmaBuildersContractor.id } },
      fingerprint_data: 'fingerprint_data_placeholder',
      aadhar_number: '111111111111',
      employeeNo: 'LAB21',
      createdBy: { connect: { id: rajeshSharmaUser.id } },
      updatedBy: { connect: { id: rajeshSharmaUser.id } },
      photos: {
        create: [
          {
            url: 'https://attendancebucketnew.s3.ap-south-1.amazonaws.com/labour-photos/a500bfd7-fa4d-4f17-beb1-13a6675102b7.jpeg',
          },
        ],
      },
      attendance: {
        create: [
          {
            inTime: '2025-01-23T04:44:33.000Z',
            outTime: '2025-01-23T10:45:49.000Z',
            workingHours: 6.02,
            date: '2025-01-23T00:00:00.000Z',
          },
          {
            inTime: '2025-01-24T04:47:51.000Z',
            outTime: '2025-01-24T13:39:26.000Z',
            workingHours: 8.859722222222222,
            date: '2025-01-24T00:00:00.000Z',
          },
          {
            inTime: '2025-01-25T05:15:52.000Z',
            outTime: '2025-01-25T10:42:24.000Z',
            workingHours: 5.442222222222222,
            date: '2025-01-25T00:00:00.000Z',
          },
          { inTime: null, outTime: null, workingHours: 0, date: '2025-01-26T00:00:00.000Z' },
          {
            inTime: '2025-01-27T04:41:30.000Z',
            outTime: '2025-01-27T14:32:49.000Z',
            workingHours: 9.855277777777777,
            date: '2025-01-27T00:00:00.000Z',
          },
          {
            inTime: '2025-01-28T13:52:15.000Z',
            outTime: '2025-01-28T13:52:15.000Z',
            workingHours: 482797.8708333333,
            date: '2025-01-28T00:00:00.000Z',
          },
          {
            inTime: '2025-01-29T04:21:21.000Z',
            outTime: '2025-01-29T04:21:21.000Z',
            workingHours: 0,
            date: '2025-01-29T00:00:00.000Z',
          },
          {
            inTime: '2025-01-30T08:50:49.000Z',
            outTime: '2025-01-30T12:27:43.000Z',
            workingHours: 3.615,
            date: '2025-01-30T00:00:00.000Z',
          },
          {
            inTime: '2025-01-31T07:03:40.000Z',
            outTime: '2025-01-31T13:37:27.000Z',
            workingHours: 6.563055555555556,
            date: '2025-01-31T00:00:00.000Z',
          },
          {
            inTime: '2025-02-01T03:54:07.000Z',
            outTime: '2025-02-01T04:11:39.000Z',
            workingHours: 0.2922222222222222,
            date: '2025-02-01T00:00:00.000Z',
          },
        ],
      },
    },
  });

  const visBLabour = await prisma.labour.create({
    data: {
      user: { connect: { id: visBUser.id } },
      contractor: { connect: { id: sharmaBuildersContractor.id } },
      fingerprint_data: 'fingerprint_data_placeholder',
      aadhar_number: '222222222222',
      employeeNo: 'LAB22',
      createdBy: { connect: { id: rajeshSharmaUser.id } },
      updatedBy: { connect: { id: rajeshSharmaUser.id } },
      photos: {
        create: [
          {
            url: 'https://attendancebucketnew.s3.ap-south-1.amazonaws.com/labour-photos/92630706-cd92-4416-aadd-1cbbe28546f7.jpeg',
          },
        ],
      },
      attendance: {
        create: [
          { inTime: null, outTime: null, workingHours: 0, date: '2025-01-23T00:00:00.000Z' },
          { inTime: null, outTime: null, workingHours: 0, date: '2025-01-24T00:00:00.000Z' },
          { inTime: null, outTime: null, workingHours: 0, date: '2025-01-25T00:00:00.000Z' },
          { inTime: null, outTime: null, workingHours: 0, date: '2025-01-26T00:00:00.000Z' },
          { inTime: null, outTime: null, workingHours: 0, date: '2025-01-27T00:00:00.000Z' },
          { inTime: null, outTime: null, workingHours: 0, date: '2025-01-28T00:00:00.000Z' },
          { inTime: null, outTime: null, workingHours: 0, date: '2025-01-29T00:00:00.000Z' },
          { inTime: null, outTime: null, workingHours: 0, date: '2025-01-30T00:00:00.000Z' },
          { inTime: null, outTime: null, workingHours: 0, date: '2025-01-31T00:00:00.000Z' },
          { inTime: null, outTime: null, workingHours: 0, date: '2025-02-01T00:00:00.000Z' },
        ],
      },
    },
  });

  const visCLabour = await prisma.labour.create({
    data: {
      user: { connect: { id: visCUser.id } },
      contractor: { connect: { id: sharmaBuildersContractor.id } },
      fingerprint_data: 'fingerprint_data_placeholder',
      aadhar_number: '333333333333',
      employeeNo: 'LAB23',
      createdBy: { connect: { id: rajeshSharmaUser.id } },
      updatedBy: { connect: { id: rajeshSharmaUser.id } },
      photos: {
        create: [
          {
            url: 'https://attendancebucketnew.s3.ap-south-1.amazonaws.com/labour-photos/7c1faa50-9066-49c5-b958-fa28024c4f1f.jpeg',
          },
        ],
      },
      attendance: {
        create: [
          {
            inTime: '2025-01-22T09:13:48.000Z',
            outTime: '2025-01-22T12:38:24.000Z',
            workingHours: 3.41,
            date: '2025-01-22T00:00:00.000Z',
          },
          {
            inTime: '2025-01-23T08:32:07.000Z',
            outTime: '2025-01-23T13:46:58.000Z',
            workingHours: 5.2475,
            date: '2025-01-23T00:00:00.000Z',
          },
          {
            inTime: '2025-01-24T13:35:42.000Z',
            outTime: '2025-01-24T13:35:42.000Z',
            workingHours: 0,
            date: '2025-01-24T00:00:00.000Z',
          },
          {
            inTime: '2025-01-25T05:19:25.000Z',
            outTime: '2025-01-25T13:39:34.000Z',
            workingHours: 8.335833333333333,
            date: '2025-01-25T00:00:00.000Z',
          },
          { inTime: null, outTime: null, workingHours: 0, date: '2025-01-26T00:00:00.000Z' },
          {
            inTime: '2025-01-27T07:19:14.000Z',
            outTime: '2025-01-27T07:19:14.000Z',
            workingHours: 0,
            date: '2025-01-27T00:00:00.000Z',
          },
          {
            inTime: '2025-01-28T09:12:26.000Z',
            outTime: '2025-01-28T09:12:26.000Z',
            workingHours: 0,
            date: '2025-01-28T00:00:00.000Z',
          },
          { inTime: null, outTime: null, workingHours: 0, date: '2025-01-29T00:00:00.000Z' },
          {
            inTime: '2025-01-30T09:08:39.000Z',
            outTime: '2025-01-30T09:08:39.000Z',
            workingHours: 0,
            date: '2025-01-30T00:00:00.000Z',
          },
          {
            inTime: '2025-01-31T12:48:16.000Z',
            outTime: '2025-01-31T13:44:33.000Z',
            workingHours: 0.9380555555555555,
            date: '2025-01-31T00:00:00.000Z',
          },
          { inTime: null, outTime: null, workingHours: 0, date: '2025-02-01T00:00:00.000Z' },
        ],
      },
    },
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
