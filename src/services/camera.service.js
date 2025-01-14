const httpStatus = require('http-status');
const FormData = require('form-data');
const AxiosDigestAuth = require('@mhoc/axios-digest-auth').default;
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
const db = require('../database/prisma');
const fs = require('fs');
const path = require('path');

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
      throw new Error('Photo file does not exist at path: ' + photo.path);
    }

    const boundary = '----WebKitFormBoundary8qzjjWmAt8tSxqen';

    let data = new FormData();

    data.append('data', JSON.stringify({ FaceInfo: { employeeNo: id } }), {
      contentType: 'application/json',
    });

    data.append('FaceDataRecord', fs.createReadStream(photo.path), {
      filename: path.basename(photo.path),
      contentType: 'image/jpeg',
    });

    const headers = {
      ...data.getHeaders(),
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Accept: '*/*',
      Host: '43.224.222.244:85',
      'If-Modified-Since': '0',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8,hi;q=0.7',
      'Cache-Control': 'max-age=0',
      Connection: 'keep-alive',
      Origin: 'http://43.224.222.244:85',
      Referer: 'http://43.224.222.244:85/',
      'X-Requested-With': 'XMLHttpRequest',
      Cookie:
        'WebSession_d09737e993=6564363563633066393363373064373938383532306366616238326431326565; _dd_s=logs=1&id=b4e87819-96e5-4884-b86b-149fb5ea20f3&created=1736794034152&expire=1736795296044',
      SessionTag: '8b7438c1654aabfda8e831c8a5fc855fc8a6b9c91cba97f646e1123cf6cf95f3',
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    };

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${BASE_URL}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json&devIndex=${DEV_INDEX}`,
      headers: headers,
      data: data,
      timeout: 30000,
    };

    const response = await digestAuth.request(config);

    fs.unlinkSync(photo.path);

    if (response.status !== 200) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to add face picture to camera system');
    }

    return response.data;
  } catch (error) {
    if (photo && photo.path) {
      fs.unlinkSync(photo.path);
    }
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Failed to add face picture to camera system: ' + (error.response?.data?.message || error.message)
    );
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

    console.log(response.data);

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
            select: {
              url: true,
            },
          },
          pdfs: {
            select: {
              url: true,
            },
          },
        },
        where: {
          NOT: {
            employeeNo: '',
          },
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
            select: {
              url: true,
            },
          },
          pdfs: {
            select: {
              url: true,
            },
          },
        },
        where: {
          NOT: {
            employeeNo: '',
          },
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
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (cameraResponse.status !== 200) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to fetch attendance from camera system');
    }

    const filteredInfoList = (cameraResponse.data?.AcsEvent?.InfoList || []).filter((record) => record.employeeNoString);

    const presentEmployees = new Set(filteredInfoList.map((record) => record.employeeNoString));

    const employeeEntriesMap = filteredInfoList.reduce((acc, entry) => {
      if (!acc[entry.employeeNoString]) {
        acc[entry.employeeNoString] = [];
      }
      acc[entry.employeeNoString].push(entry);
      return acc;
    }, {});

    const employeeWorkingHours = Object.keys(employeeEntriesMap).reduce((acc, employeeNoString) => {
      const entries = employeeEntriesMap[employeeNoString];
      if (entries.length > 0) {
        entries.sort((a, b) => new Date(a.time) - new Date(b.time));

        const firstEntry = entries[0];
        const lastEntry = entries[entries.length - 1];

        const startTime = new Date(firstEntry.time);
        const endTime = new Date(lastEntry.time);
        const workingHours = (endTime - startTime) / (1000 * 60 * 60);

        acc[employeeNoString] = {
          inTime: firstEntry.time,
          outTime: lastEntry.time,
          workingHours: workingHours.toFixed(2),
        };
      }
      return acc;
    }, {});

    const attendanceData = allEmployees.map((employee) => {
      const workingHoursData = employeeWorkingHours[employee.employeeNo] || {
        inTime: null,
        outTime: null,
        workingHours: 0,
      };

      return {
        id: employee.id,
        employeeNo: employee.employeeNo,
        name: employee.user.name,
        type: employee.type,
        role: employee.user.role.name,
        contractor: employee.contractor?.firm_name || null,
        status: presentEmployees.has(employee.employeeNo) ? 'PRESENT' : 'ABSENT',
        lastAccess: getLastAccessTime(filteredInfoList, employee.employeeNo),
        photos: employee.photos,
        pdfs: employee.pdfs,
        inTime: workingHoursData.inTime,
        outTime: workingHoursData.outTime,
        workingHours: workingHoursData.workingHours,
      };
    });

    const sortedAttendance = attendanceData.sort((a, b) => a.name.localeCompare(b.name));
    const presentCount = sortedAttendance.filter((emp) => emp.status === 'PRESENT').length;
    const absentCount = sortedAttendance.filter((emp) => emp.status === 'ABSENT').length;
    const totalEmployees = sortedAttendance.length;

    return {
      success: true,
      data: {
        results: sortedAttendance,
        summary: {
          total_present: presentCount,
          total_absent: absentCount,
          total_employees: totalEmployees,
        },
      },
      metadata: {
        dateRange: {
          startTime,
          endTime,
        },
      },
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
