const httpStatus = require('http-status');
const AxiosDigestAuth = require('@mhoc/axios-digest-auth').default;
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
const db = require('../database/prisma');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

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

const getAttendanceRecords = async (startDate, endDate) => {
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

    const start = new Date(startTime);
    const end = new Date(endTime);
    const daysDifference = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    const [labours, contractors] = await Promise.all([
      db.labour.findMany({
        select: {
          id: true,
          employeeNo: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          contractor: {
            select: {
              id: true,
              firm_name: true,
            },
          },
          photos: {
            select: { url: true },
          },
          pdfs: {
            select: { url: true },
          },
        },
        where: {
          NOT: { employeeNo: '' },
        },
      }),
      db.contractor.findMany({
        select: {
          id: true,
          employeeNo: true,
          firm_name: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          photos: {
            select: { url: true },
          },
          pdfs: {
            select: { url: true },
          },
        },
        where: {
          NOT: { employeeNo: '' },
        },
      }),
    ]);

    const allEmployees = [
      ...labours,
      ...contractors.map((contractor) => ({
        id: contractor.id,
        employeeNo: contractor.employeeNo,
        user: contractor.user,
        contractor: {
          id: contractor.id,
          firm_name: contractor.firm_name,
        },
        photos: contractor.photos,
        pdfs: contractor.pdfs,
        type: 'CONTRACTOR',
      })),
    ].map((emp) => ({
      ...emp,
      type: emp.type || 'LABOUR',
    }));

    console.log(startTime, endTime);

    const cameraApiBody = {
      AcsEventCond: {
        searchID: Math.random().toString(36).substring(2, 15),
        searchResultPosition: 0,
        maxResults: 500,
        startTime: startTime,
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

    const filteredInfoList = (cameraResponse.data?.AcsEvent?.InfoList || []).filter((record) => record.employeeNoString);

    console.log('FILTERD INFOR LIST', filteredInfoList);

    console.log('LABOURS', await db.labour.findMany());

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

    const attendanceByDate = {};

    Object.keys(employeeEntriesByDate).forEach((date) => {
      const employeesForDate = employeeEntriesByDate[date];

      attendanceByDate[date] = allEmployees.map((employee) => {
        const entries = employeesForDate[employee.employeeNo] || [];
        let workingHoursData = {
          inTime: null,
          outTime: null,
          workingHours: 0,
        };

        if (entries.length > 0) {
          entries.sort((a, b) => new Date(a.time) - new Date(b.time));
          const firstEntry = entries[0];
          const lastEntry = entries[entries.length - 1];
          const startTime = new Date(firstEntry.time);
          const endTime = new Date(lastEntry.time);
          const workingHours = (endTime - startTime) / (1000 * 60 * 60);

          workingHoursData = {
            inTime: firstEntry.time,
            outTime: lastEntry.time,
            workingHours: workingHours.toFixed(2),
          };
        }

        return {
          id: employee.id,
          employeeNo: employee.employeeNo,
          name: employee.user.name,
          type: employee.type,
          role: employee.user.role.name,
          contractor: employee.contractor?.firm_name || null,
          status: entries.length > 0 ? 'PRESENT' : 'ABSENT',
          ...workingHoursData,
        };
      });
    });

    const summary = Object.keys(attendanceByDate).reduce((acc, date) => {
      const employeesForDate = attendanceByDate[date];
      acc[date] = {
        total_present: employeesForDate.filter((emp) => emp.status === 'PRESENT').length,
        total_absent: employeesForDate.filter((emp) => emp.status === 'ABSENT').length,
        total_employees: employeesForDate.length,
      };
      return acc;
    }, {});

    return {
      success: true,
      data: {
        results: attendanceByDate,
        summary,
      },
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

const getLastAccessTime = (infoList, employeeNo) => {
  const employeeRecords = infoList.filter((record) => record.employeeNoString === employeeNo);
  if (employeeRecords.length === 0) return null;

  return new Date(Math.max(...employeeRecords.map((record) => new Date(record.time).getTime())));
};

const getTodayDateRange = () => {
  const today = new Date().toISOString().split('T')[0];
  return {
    startDate: `${today}T00:01:04+05:30`,
    endDate: `${today}T23:59:04+05:30`,
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

const cameraService = {
  addFacePicturesToCamera,
  deleteUserFromCamera,
  updateUserInCamera,
  deleteFacePictureFromCamera,
  addUserToCamera,
  searchUserInCamera,
  getAttendanceRecords,
};

module.exports = cameraService;
