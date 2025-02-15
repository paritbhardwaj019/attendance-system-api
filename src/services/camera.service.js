const httpStatus = require('http-status');
const AxiosDigestAuth = require('@mhoc/axios-digest-auth').default;
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
const db = require('../database/prisma');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const timeUtils = require('../utils/timeUtils');

const BASE_URL = 'http://43.224.222.244:85';
const DEV_INDEX = '20F57640-5C66-49B3-86D5-750E856BEA4A';

const digestAuth = new AxiosDigestAuth({
  username: config.digestAuth.username,
  password: config.digestAuth.password,
});

/**
 * Add user to camera system
 * @param {string} id - User ID from our system
 * @param {string} name - User's name
 */
const addUserToCamera = async (id, name) => {
  try {
    const response = await digestAuth.request({
      method: 'POST',
      url: `${BASE_URL}/ISAPI/AccessControl/UserInfo/Record?format=json&devIndex=${DEV_INDEX}`,
      data: {
        UserInfo: [
          {
            employeeNo: id,
            name: name,
            Valid: {
              beginTime: new Date().toISOString().split('T')[0] + 'T00:00:00',
              endTime: '2027-12-31T23:59:59',
            },
          },
        ],
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status !== 200) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to add user to camera system');
    }

    return response.data;
  } catch (error) {
    console.error('Camera API Error:', error);
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Failed to add user to camera system: ' + (error.response?.data?.message || error.message)
    );
  }
};

const addFacePicturesToCamera = async (id, photo) => {
  try {
    if (!fs.existsSync(photo.path)) {
      throw new ApiError(400, 'Photo file does not exist at path: ' + photo.path);
    }

    const pythonScriptPath = path.resolve(__dirname, '../scripts/add_face.py');

    const command = `python3 ${pythonScriptPath} ${id} ${photo.path}`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        throw new ApiError(500, 'Failed to add face picture to camera system: ' + error.message);
      }

      if (stderr) {
        throw new ApiError(500, 'Failed to add face picture to camera system: ' + stderr);
      }

      fs.unlinkSync(photo.path);

      return stdout;
    });
  } catch (error) {
    if (photo && photo.path) {
      fs.unlinkSync(photo.path);
    }
    if (error instanceof ApiError) {
      throw error;
    } else {
      throw new ApiError(
        500,
        'Failed to add face picture to camera system: ' + (error.response?.data?.message || error.message)
      );
    }
  }
};
/**
 * Delete user from camera system
 * @param {string} id - User ID from our system
 */
const deleteUserFromCamera = async (id) => {
  try {
    const response = await digestAuth.request({
      method: 'PUT',
      url: `${BASE_URL}/ISAPI/AccessControl/UserInfoDetail/Delete?format=json&devIndex=${DEV_INDEX}`,
      data: {
        UserInfoDetail: {
          mode: 'byEmployeeNo',
          EmployeeNoList: [
            {
              employeeNo: id,
            },
          ],
        },
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status !== 200) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to delete user from camera system');
    }

    return response.data;
  } catch (error) {
    console.error('Camera API Error:', error);
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Failed to delete user from camera system: ' + (error.response?.data?.message || error.message)
    );
  }
};

/**
 * Update user in camera system
 * @param {string} id - User ID from our system
 * @param {string} name - User's name
 */
const updateUserInCamera = async (id, name) => {
  try {
    const response = await digestAuth.request({
      method: 'PUT',
      url: `${BASE_URL}/ISAPI/AccessControl/UserInfo/Modify?format=json&devIndex=${DEV_INDEX}`,
      data: {
        UserInfo: {
          employeeNo: id,
          name: name,
          Valid: {
            beginTime: new Date().toISOString().split('T')[0] + 'T00:00:00',
            endTime: '2027-12-31T23:59:59',
          },
        },
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status !== 200) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to update user in camera system');
    }

    return response.data;
  } catch (error) {
    console.error('Camera API Error:', error);
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Failed to update user in camera system: ' + (error.response?.data?.message || error.message)
    );
  }
};

/**
 * Delete face picture from camera system
 * @param {string} id - User ID from our system
 */
const deleteFacePictureFromCamera = async (id) => {
  try {
    const response = await digestAuth.request({
      method: 'PUT',
      url: `${BASE_URL}/ISAPI/Intelligent/FDLib/FDSearch/Delete?format=json&devIndex=${DEV_INDEX}`,
      data: {
        FaceInfoDelCond: {
          EmployeeNoList: [
            {
              employeeNo: id,
            },
          ],
        },
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status !== 200) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to delete face picture from camera system');
    }

    return response.data;
  } catch (error) {
    console.error('Camera API Error:', error);
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Failed to delete face picture from camera system: ' + (error.response?.data?.message || error.message)
    );
  }
};

/**
 * Search users in camera system
 * @param {number} page - Page number for pagination (starts from 1)
 * @param {number} limit - Number of results per page
 * @param {string} name - Name to search for (optional)
 * @param {Date} startDate - Start date for attendance range (defaults to today)
 * @param {Date} endDate - End date for attendance range (defaults to today)
 */
const searchUserInCamera = async (page = 1, limit = 10, name = '', startDate = new Date(), endDate = new Date()) => {
  try {
    const response = await digestAuth.request({
      method: 'POST',
      url: `${BASE_URL}/ISAPI/AccessControl/UserInfo/Search?format=json&devIndex=${DEV_INDEX}`,
      data: {
        UserInfoSearchCond: {
          searchID: Math.random().toString(36).substring(2, 15),
          searchResultPosition: 0,
          maxResults: 10000,
        },
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const [contractors, labours] = await Promise.all([
      db.contractor.findMany({
        select: {
          employeeNo: true,
        },
      }),
      db.labour.findMany({
        select: {
          employeeNo: true,
        },
      }),
    ]);

    const dbEmployeeNos = new Set([...contractors.map((c) => c.employeeNo), ...labours.map((l) => l.employeeNo)]);

    if (response.status !== 200) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to search user in camera system');
    }

    let filteredUsers = response.data.UserInfoSearch.UserInfo.filter((user) => dbEmployeeNos.has(user.employeeNo));

    if (name) {
      const searchTerm = name.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (user) => user.name.toLowerCase().includes(searchTerm) || user.employeeNo.toLowerCase().includes(searchTerm)
      );
    }

    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    filteredUsers = filteredUsers.filter((user) => {
      const validBeginTime = new Date(user.Valid.beginTime).getTime();
      const validEndTime = new Date(user.Valid.endTime).getTime();
      return validBeginTime <= endTimestamp && validEndTime >= startTimestamp;
    });

    const startIndex = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + limit);

    const attendanceByDate = paginatedUsers.reduce((acc, user) => {
      const attendanceDate = new Date(user.Valid.beginTime).toISOString().split('T')[0];
      if (!acc[attendanceDate]) {
        acc[attendanceDate] = [];
      }
      acc[attendanceDate].push(user);
      return acc;
    }, {});

    return {
      ...response.data,
      UserInfoSearch: {
        ...response.data.UserInfoSearch,
        UserInfo: attendanceByDate,
        numOfMatches: filteredUsers.length,
        paginatedMatches: paginatedUsers.length,
      },
    };
  } catch (error) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Failed to search user in camera system: ' + (error.response?.data?.message || error.message)
    );
  }
};

const getAttendanceRecords = async (startDate, endDate, contractorId = null) => {
  try {
    let startTime, endTime;

    if (!startDate || !endDate) {
      const todayRange = getTodayDateRange();
      startTime = todayRange.startDate;
      endTime = todayRange.endDate;
    } else {
      const formattedStartDate = formatDateForCamera(startDate);
      const formattedEndDate = formatDateForCamera(endDate);
      startTime = typeof formattedStartDate === 'object' ? formattedStartDate.startTime : formattedStartDate;
      endTime = typeof formattedEndDate === 'object' ? formattedEndDate.endTime : formattedEndDate;
    }

    const start = formatTimeInIndianTimezone(startTime);
    const end = formatTimeInIndianTimezone(endTime);

    // // Get today's date in yyyy-mm-dd format
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // "2025-01-22"

    // // Get start date in yyyy-mm-dd format
    const startString = start.split('T')[0]; // "2025-01-22"

    // // Check if both dates are the same
    const isTodayDate = startString === todayString;
    // console.log('Is Start Date Today?', isToday);

    // const todayDate = new Date();
    // const isTodayDate = start.toDateString() === todayDate.toDateString();
    // const isTodayDate = true;
    let attendanceData;
    // console.log('start', startTime, 'today', endTime)
    // console.log(isTodayDate, startString, todayString)
    const labours = await db.labour.findMany({
      select: {
        employeeNo: true,
        photos: true,
      },
    });

    const employeeNoToPhotosMap = labours.reduce((acc, labour) => {
      acc[labour.employeeNo] = labour.photos;
      return acc;
    }, {});

    if (isTodayDate) {
      // console.log('END TIME', endTime);

      const currentTime = new Date();
      const thirtyMinutesAgo = new Date(currentTime.getTime() - 30 * 60 * 1000);
      // console.log('THIRTY MINUTES AGO', thirtyMinutesAgo, thirtyMinutesAgo.toDateString());
      const thirtyMinutesAgoFormatted = formatTimeInIndianTimezone(thirtyMinutesAgo);
      // console.log('THIRTY MINUTES AGO FORMATTED', thirtyMinutesAgoFormatted);
      const twoHoursAgo = new Date(currentTime.getTime() - 1 * 60 * 60 * 1000);

      const timezoneOffset = '+05:30'; // Replace with your desired timezone offset
      const year = twoHoursAgo.getFullYear();
      const month = String(twoHoursAgo.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
      const day = String(twoHoursAgo.getDate()).padStart(2, '0');
      const hours = String(twoHoursAgo.getHours()).padStart(2, '0');
      const minutes = String(twoHoursAgo.getMinutes()).padStart(2, '0');
      const seconds = String(twoHoursAgo.getSeconds()).padStart(2, '0');

      // Construct the startTime string in the desired format
      startTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezoneOffset}`;

      const cameraApiBody = {
        AcsEventCond: {
          searchID: Math.random().toString(36).substring(2, 15),
          searchResultPosition: 0,
          maxResults: 100,
          startTime: thirtyMinutesAgoFormatted,
          // startTime: "2025-01-22T17:28:51+05:30",
          endTime: endTime,
        },
      };

      const cameraResponse = await digestAuth.request({
        method: 'POST',
        url: `${BASE_URL}/ISAPI/AccessControl/AcsEvent?format=json&devIndex=${DEV_INDEX}`,
        data: cameraApiBody,
        headers: { 'Content-Type': 'application/json' },
      });

      if (cameraResponse.status !== 200) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to fetch attendance from camera system');
      }

      // console.log('CAMERA RESPONSE', cameraResponse.data?.AcsEvent?.InfoList);

      const filteredInfoList = (cameraResponse.data?.AcsEvent?.InfoList || []).filter((record) => {
        return labours.some((labour) => labour.employeeNo === record.employeeNoString);
      });

      // console.log('FILTERED INFO LIST', filteredInfoList);

      const employeeEntriesByDate = filteredInfoList.reduce((acc, entry) => {
        const date = new Date(entry.time).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {};
        }
        if (!acc[date][entry.employeeNoString]) {
          acc[date][entry.employeeNoString] = [];
        }
        acc[date][entry.employeeNoString].push(entry);
        return acc;
      }, {});

      attendanceData = {};
      for (const date in employeeEntriesByDate) {
        const employeesForDate = employeeEntriesByDate[date];
        attendanceData[date] = [];

        // console.log('EMPLOYEES FOR DATE', employeesForDate);

        for (const employeeNo in employeesForDate) {
          const entries = employeesForDate[employeeNo];
          if (entries.length > 0) {
            entries.sort((a, b) => new Date(a.time) - new Date(b.time));

            const inTime = entries[0].time;
            const outTime = entries.length === 1 ? inTime : entries[entries.length - 1].time;

            const inTimeDate = new Date(inTime);
            const outTimeDate = new Date(outTime);
            const workingHours = ((outTimeDate - inTimeDate) / (1000 * 60 * 60)).toFixed(2);

            const photos = employeeNoToPhotosMap[employeeNo] || [];
            // console.log("entries length", entries.length)

            attendanceData[date].push({
              labourId: employeeNo,
              inTime: inTime,
              outTime: outTime,
              workingHours: parseFloat(workingHours),
              status: 'PRESENT',
              employeeNo: employeeNo,
              name: entries[0].name || 'Unknown',
              photos: photos,
            });
          }
        }
      }
    } else {
      const whereClause = {
        date: {
          gte: startTime,
          lte: endTime,
        },
      };

      if (contractorId) {
        whereClause.labour = {
          contractorId: parseInt(contractorId, 10),
        };
      }

      const dbRecords = await db.attendance.findMany({
        where: whereClause,
        include: {
          labour: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  mobile_number: true,
                },
              },
              contractor: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              photos: true,
            },
          },
        },
      });
      // console.log('DB RECORDS', dbRecords);

      attendanceData = dbRecords.reduce((acc, record) => {
        // console.log('RECORD', record);
        const date = new Date(record.date).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = [];
        }
        const inTime = new Date(record.inTime);
        const outTime = new Date(record.outTime);
        const workingHours = ((outTime - inTime) / (1000 * 60 * 60)).toFixed(2);
        // console.log('contractor details', record.labour.contractor.user.name, record.labour.contractor.user.id);
        acc[date].push({
          labourId: record.labourId,
          inTime: record.inTime,
          outTime: record.outTime,
          workingHours: parseFloat(workingHours),
          status: record.status || 'ABSENT',
          employeeNo: record.labour.employeeNo,
          name: record.labour.user.name,
          contractorId: record.labour.contractor.id,
          contractorName: record.labour.contractor.user?.name || 'Unknown',
          photos: record.labour.photos,
        });

        return acc;
      }, {});
    }

    // console.log('ATTENDANCE DATA v2', attendanceData);

    const uniqueRecords = [];
    const seenLabourIds = new Set();

    let totalWorkingHours = 0;
    let totalRecordsCount = 0;

    for (const date in attendanceData) {
      const recordsForDate = attendanceData[date];
      for (const record of recordsForDate) {
        if (!seenLabourIds.has(record.labourId)) {
          seenLabourIds.add(record.labourId);

          const flattenedRecord = {
            id: record.labourId,
            inTime: record.inTime,
            outTime: record.outTime,
            workingHours: record.workingHours,
            date: date,
            name: record.labour?.user?.name || 'Unknown',
            username: record.labour?.user?.username || 'Unknown',
            mobile_number: record.labour?.user?.mobile_number || 'Unknown',
            firm_name: record.labour?.contractor?.firm_name || 'Unknown',
            employeeNo: record.employeeNo,
            name: record.name,
            contractorId: record.labour?.contractor?.id || null,
            contractorName: record.labour?.contractor?.user?.name || 'Unknown',
            photos: record.photos || [],
          };

          uniqueRecords.push(flattenedRecord);

          totalWorkingHours += record.workingHours || 0;
          totalRecordsCount += 1;
        }
      }
    }

    const summary = {
      totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
      totalRecords: totalRecordsCount,
    };

    const columns = [
      { field: 'id', headerName: 'ID', width: 100 },
      { field: 'name', headerName: 'Name', width: 150 },
      { field: 'username', headerName: 'Username', width: 150 },
      { field: 'firm_name', headerName: 'Firm Name', width: 150 },
      { field: 'employeeNo', headerName: 'Employee No', width: 150 },
      { field: 'firstName', headerName: 'First Name', width: 150 },
      { field: 'lastName', headerName: 'Last Name', width: 150 },
      { field: 'inTime', headerName: 'In Time', width: 150 },
      { field: 'outTime', headerName: 'Out Time', width: 150 },
      { field: 'workingHours', headerName: 'Working Hours', width: 150 },
      { field: 'date', headerName: 'Date', width: 150 },
    ];
    // console.log('ATTENDANCE DATA final', attendanceData);
    return {
      data: attendanceData,
      summary,
      columns,
      metadata: { dateRange: { startTime, endTime } },
    };
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Failed to fetch attendance records: ' + (error.response?.data?.message || error.message)
    );
  }
};

// 1. Get Labours with optional contractor filter
const getDLabours = async (contractorId = null) => {
  try {
    return await db.labour.findMany({
      where: contractorId ? { contractorId: parseInt(contractorId, 10) } : {},
      include: {
        user: {
          select: {
            name: true,
            username: true,
            mobile_number: true,
          },
        },
        contractor: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        photos: true,
      },
    });
  } catch (error) {
    console.error('Error fetching labours:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to fetch labours');
  }
};

// 2. Get Attendance records for a specific date
const getDAttendance = async (date) => {
  try {
    const queryDate = new Date(date);
    return await db.attendance.findMany({
      where: {
        date: {
          gte: new Date(queryDate.setHours(0, 0, 0, 0)),
          lte: new Date(queryDate.setHours(23, 59, 59, 999)),
        },
      },
      include: {
        labour: {
          select: {
            employeeNo: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to fetch attendance records');
  }
};

// 3. Get Contractors list
const getDContractors = async () => {
  try {
    return await db.contractor.findMany({
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching contractors:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to fetch contractors');
  }
};

// Helper function to format time in camera's required format
const formatCameraTime = () => {
  const currentTime = timeUtils.getCurrentTime();
  // console.log('CURRENT TIME', currentTime);
  const thirtyMinutesAgo = currentTime.subtract(30, 'minutes');
  // console.log('THIRTY MINUTES AGO', thirtyMinutesAgo);
  return thirtyMinutesAgo.format('YYYY-MM-DDTHH:mm:ss+05:30');
};

// Modified camera result function to use the simplified formatCameraTime
const getDCameraResult = async () => {
  try {
    const formattedStartTime = formatCameraTime();

    const response = await digestAuth.request({
      method: 'POST',
      url: `${BASE_URL}/ISAPI/AccessControl/AcsEvent?format=json&devIndex=${DEV_INDEX}`,
      data: {
        AcsEventCond: {
          searchID: Math.random().toString(36).substring(2, 15),
          searchResultPosition: 0,
          maxResults: 100,
          startTime: formattedStartTime,
        },
      },
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status !== 200) {
      throw new Error('Failed to fetch camera data');
    }

    return response.data?.AcsEvent?.InfoList || [];
  } catch (error) {
    console.error('Error fetching camera results:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to fetch camera data');
  }
};

const getDailyAttendance = async (startDate, contractorId = null) => {
  try {
    const queryDate = startDate ? timeUtils.formatToIST(startDate) : timeUtils.getCurrentTime();
    const queryDateString = timeUtils.formatDateOnly(queryDate);
    // Get all required data
    const [labours, attendanceRecords] = await Promise.all([getDLabours(contractorId), getDAttendance(queryDateString)]);

    const today = new Date();
    const isToday = queryDateString === timeUtils.formatDateOnly(today);

    if (!isToday) {
      // ... existing historical data processing ...
    }

    // Process today's attendance
    let cameraData = await getDCameraResult();

    // Create attendance map for quick lookup
    const attendanceMap = new Map(attendanceRecords.map((record) => [record.labourId, record]));

    // Process each labour
    const processedRecords = await Promise.all(
      labours.map(async (labour) => {
        // Find camera records for this labour
        const cameraRecords = cameraData.filter((record) => record.employeeNoString === labour.employeeNo);

        let attendanceRecord = attendanceMap.get(labour.id);
        let inTime = attendanceRecord?.inTime || null;
        let outTime = attendanceRecord?.outTime || null;

        // Process camera records if found
        if (cameraRecords.length > 0) {
          // Sort camera records by time
          cameraRecords.sort((a, b) => new Date(a.time) - new Date(b.time));
          const latestCameraTime = new Date(cameraRecords[cameraRecords.length - 1].time);

          if (!attendanceRecord) {
            // Case 1: No attendance record exists - create new
            attendanceRecord = await db.attendance.create({
              data: {
                labourId: labour.id,
                date: new Date(queryDateString),
                inTime: new Date(cameraRecords[0].time),
                outTime: latestCameraTime,
                workingHours: (latestCameraTime - new Date(cameraRecords[0].time)) / (1000 * 60 * 60),
              },
            });
          } else {
            // Case 2: Attendance record exists
            if (!inTime) {
              // Case 2a: No inTime - update both inTime and outTime
              await db.attendance.update({
                where: { id: attendanceRecord.id },
                data: {
                  inTime: new Date(cameraRecords[0].time),
                  outTime: latestCameraTime,
                  workingHours: (latestCameraTime - new Date(inTime)) / (1000 * 60 * 60),
                },
              });
            } else if (latestCameraTime > new Date(outTime)) {
              // Case 2b: Update outTime if camera time is later
              await db.attendance.update({
                where: { id: attendanceRecord.id },
                data: {
                  outTime: latestCameraTime,
                  workingHours: (latestCameraTime - new Date(inTime)) / (1000 * 60 * 60),
                },
              });
            }
          }
        }

        // Get final attendance record after updates
        const finalRecord =
          attendanceRecord ||
          (await db.attendance.findUnique({
            where: {
              labourId_date: {
                labourId: labour.id,
                date: new Date(queryDateString),
              },
            },
          }));

        // Calculate final working hours
        let workingHours = 0;
        if (finalRecord?.inTime && finalRecord?.outTime) {
          workingHours = (new Date(finalRecord.outTime) - new Date(finalRecord.inTime)) / (1000 * 60 * 60);
        }

        return {
          labourId: labour.id,
          employeeNo: labour.employeeNo,
          name: labour.user.name,
          inTime: timeUtils.formatTimeOnly(finalRecord?.inTime),
          outTime: timeUtils.formatTimeOnly(finalRecord?.outTime),
          workingHours: parseFloat(workingHours.toFixed(2)),
          contractorId: labour.contractor?.id || null,
          contractorName: labour.contractor?.user?.name || 'N/A',
          status: finalRecord?.inTime ? 'PRESENT' : 'ABSENT',
          photoUrl: labour.photos?.[0]?.url || null,
          date: queryDateString,
        };
      })
    );

    // Calculate summary
    const summary = processedRecords.reduce(
      (acc, record) => ({
        totalWorkingHours: acc.totalWorkingHours + (record.workingHours || 0),
        totalRecords: acc.totalRecords + 1,
        presentCount: acc.presentCount + (record.status === 'PRESENT' ? 1 : 0),
        absentCount: acc.absentCount + (record.status === 'ABSENT' ? 1 : 0),
      }),
      { totalWorkingHours: 0, totalRecords: 0, presentCount: 0, absentCount: 0 }
    );

    return {
      summary: {
        totalWorkingHours: parseFloat(summary.totalWorkingHours.toFixed(2)).toString(),
        totalRecords: summary.totalRecords.toString(),
        presentCount: summary.presentCount.toString(),
        absentCount: summary.absentCount.toString(),
      },
      data: processedRecords,
    };
  } catch (error) {
    console.error('Error in getDailyAttendance:', error);
    throw new ApiError(error.statusCode || httpStatus.BAD_REQUEST, 'Failed to fetch daily attendance: ' + error.message);
  }
};

const formatResultTime = (time) => {
  if (!time) return null;
  return timeUtils.formatTimeOnly(time);
};

const getLastAccessTime = (infoList, employeeNo) => {
  const employeeRecords = infoList.filter((record) => record.employeeNoString === employeeNo);
  if (employeeRecords.length === 0) return null;

  return new Date(Math.max(...employeeRecords.map((record) => new Date(record.time).getTime())));
};

const getTodayDateRange = () => {
  const today = timeUtils.getCurrentTime();
  return {
    startDate: today.startOf('day').format('YYYY-MM-DDTHH:mm:ss+05:30'),
    endDate: today.endOf('day').format('YYYY-MM-DDTHH:mm:ss+05:30'),
  };
};

const formatDateForCamera = (date) => {
  const formattedDate = new Date(date).toISOString().split('T')[0];
  const hours = new Date(date).getUTCHours();

  if (hours === 0) {
    return {
      startTime: `${formattedDate}T00:01:04+05:30`,
      endTime: `${formattedDate}T23:59:04+05:30`,
    };
  }

  return new Date(date).toISOString().replace('Z', '+05:30');
};

const formatTimeInIndianTimezone = (date) => {
  return timeUtils.formatToIST(date).format('YYYY-MM-DDTHH:mm:ss+05:30');
};

const fillDataInDb = async () => {
  try {
    const startDateTime = new Date('2025-01-23T13:00:00+05:30');
    const endDateTime = new Date('2025-01-23T21:00:00+05:30');

    // Get all labours for reference
    const labours = await db.labour.findMany({
      select: {
        id: true,
        employeeNo: true,
      },
    });

    const employeeNoToLabourId = labours.reduce((acc, labour) => {
      acc[labour.employeeNo] = labour.id;
      return acc;
    }, {});

    // Process data in 30-minute intervals
    let currentStartTime = startDateTime;

    while (currentStartTime < endDateTime) {
      const intervalEndTime = new Date(currentStartTime.getTime() + 30 * 60 * 1000);

      // Call camera API
      const cameraResponse = await digestAuth.request({
        method: 'POST',
        url: `${BASE_URL}/ISAPI/AccessControl/AcsEvent?format=json&devIndex=${DEV_INDEX}`,
        data: {
          AcsEventCond: {
            searchID: Math.random().toString(36).substring(2, 15),
            searchResultPosition: 0,
            maxResults: 100,
            startTime: formatTimeInIndianTimezone(currentStartTime),
            endTime: formatTimeInIndianTimezone(intervalEndTime),
          },
        },
        headers: { 'Content-Type': 'application/json' },
      });

      if (cameraResponse.data?.AcsEvent?.InfoList) {
        // Group entries by employeeNo
        const entriesByEmployee = cameraResponse.data.AcsEvent.InfoList.reduce((acc, entry) => {
          if (!acc[entry.employeeNoString]) {
            acc[entry.employeeNoString] = [];
          }
          acc[entry.employeeNoString].push(entry);
          return acc;
        }, {});

        // Process each employee's entries
        for (const [employeeNo, entries] of Object.entries(entriesByEmployee)) {
          const labourId = employeeNoToLabourId[employeeNo];
          if (!labourId) continue; // Skip if labour not found in our system

          // Sort entries by time
          entries.sort((a, b) => new Date(a.time) - new Date(b.time));

          const entryDate = timeUtils.formatToIST(entries[0].time);
          const dateString = timeUtils.formatDateOnly(entryDate);

          // Try to find existing attendance record
          const existingRecord = await db.attendance.findUnique({
            where: {
              labourId_date: {
                labourId: labourId,
                date: new Date(dateString),
              },
            },
          });

          if (existingRecord) {
            // Update existing record if new outTime is later
            const latestTime = timeUtils.formatToIST(entries[entries.length - 1].time);
            const existingOutTime = timeUtils.formatToIST(existingRecord.outTime);

            if (latestTime > existingOutTime) {
              const updatedWorkingHours = (latestTime - timeUtils.formatToIST(existingRecord.inTime)) / (1000 * 60 * 60);

              await db.attendance.update({
                where: {
                  id: existingRecord.id,
                },
                data: {
                  outTime: latestTime,
                  workingHours: parseFloat(updatedWorkingHours.toFixed(2)),
                },
              });
            }
          } else {
            // Create new record
            const inTime = timeUtils.formatToIST(entries[0].time);
            const outTime = timeUtils.formatToIST(entries[entries.length - 1].time);
            const workingHours = (outTime - inTime) / (1000 * 60 * 60);

            await db.attendance.create({
              data: {
                labourId: labourId,
                date: new Date(dateString),
                inTime: inTime,
                outTime: outTime,
                workingHours: parseFloat(workingHours.toFixed(2)),
              },
            });
          }
        }
      }

      // Move to next interval
      currentStartTime = intervalEndTime;
    }

    return { success: true, message: 'Data fill completed successfully' };
  } catch (error) {
    console.error('Error filling attendance data:', error);
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Failed to fill attendance data: ' + (error.response?.data?.message || error.message)
    );
  }
};

// const test = async () => {
//   try {
//     // Find labour by employeeNo
//     const employeeNo = 'LAB23';
//     const date = '2025-01-22';
//     const labour = await db.labour.findFirst({
//       where: {
//         employeeNo: employeeNo,
//       },
//       include: {
//         user: {
//           select: {
//             id: true,
//             name: true,
//             username: true,
//             mobile_number: true,
//           },
//         },
//         contractor: {
//           include: {
//             user: {
//               select: {
//                 name: true,
//               },
//             },
//           },
//         },
//         photos: true,
//       },
//     });

//     if (!labour) {
//       throw new ApiError(httpStatus.NOT_FOUND, `No labour found with employee number: ${employeeNo}`);
//     }

//     console.log('Labour Details:', {
//       id: labour.id,
//       employeeNo: labour.employeeNo,
//       name: labour.user.name,
//       username: labour.user.username,
//       mobile_number: labour.user.mobile_number,
//       contractor: labour.contractor?.user?.name || 'Not Assigned',
//       photoCount: labour.photos.length,
//     });

//     // Find attendance for the specified date
//     const attendance = await db.attendance.findUnique({
//       where: {
//         labourId_date: {
//           labourId: labour.id,
//           date: new Date(date),
//         },
//       },
//     });

//     const response = {
//       labour: {
//         id: labour.id,
//         employeeNo: labour.employeeNo,
//         name: labour.user.name,
//         username: labour.user.username,
//         mobile_number: labour.user.mobile_number,
//         contractor: labour.contractor?.user?.name || 'Not Assigned',
//         photos: labour.photos,
//       },
//       attendance: attendance ? {
//         date: attendance.date,
//         inTime: attendance.inTime,
//         outTime: attendance.outTime,
//         workingHours: attendance.workingHours,
//         status: attendance.outTime ? 'PRESENT' : 'ABSENT',
//       } : {
//         date: new Date(date),
//         status: 'NO_RECORD',
//       },
//     };

//     console.log('Response:', JSON.stringify(response, null, 2));
//     return response;

//   } catch (error) {
//     console.error('Error in test function:', error);
//     throw new ApiError(
//       error.statusCode || httpStatus.INTERNAL_SERVER_ERROR,
//       error.message || 'An error occurred while fetching labour details'
//     );
//   }
// };
const test = async () => {
  const formattedTime = formatCameraTime();
  console.log('Formatted Time:', formattedTime);
  // await fillDataInDb();
  console.log('test');
};
const cameraService = {
  addFacePicturesToCamera,
  deleteUserFromCamera,
  updateUserInCamera,
  deleteFacePictureFromCamera,
  addUserToCamera,
  searchUserInCamera,
  getAttendanceRecords,
  getDailyAttendance,
  fillDataInDb,
  test,
  getDCameraResult,
};

module.exports = cameraService;
