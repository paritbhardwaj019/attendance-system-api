const httpStatus = require('http-status');
const FormData = require('form-data');
const AxiosDigestAuth = require('@mhoc/axios-digest-auth').default;
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
const db = require('../database/prisma');

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

/**
 * Add face picture to camera system
 * @param {string} id - User ID from our system
 * @param {Buffer} photoBuffer - Photo buffer
 */
const addFacePictureToCamera = async (id, photoBuffer) => {
  try {
    const formData = new FormData();
    formData.append('file', photoBuffer, {
      filename: 'face.jpg',
      contentType: 'image/jpeg',
    });

    formData.append(
      'data',
      JSON.stringify({
        FaceInfo: {
          employeeNo: id,
        },
      })
    );

    const response = await digestAuth.request({
      method: 'POST',
      url: `${BASE_URL}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json&devIndex=${DEV_INDEX}`,
      data: formData,
      headers: {
        ...formData.getHeaders(),
      },
    });

    if (response.status !== 200) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to add face picture to camera system');
    }

    return response.data;
  } catch (error) {
    console.error('Camera API Error:', error);
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

    // Filter by name if provided
    if (name) {
      const searchTerm = name.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (user) => user.name.toLowerCase().includes(searchTerm) || user.employeeNo.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by date range
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    filteredUsers = filteredUsers.filter((user) => {
      const validBeginTime = new Date(user.Valid.beginTime).getTime();
      const validEndTime = new Date(user.Valid.endTime).getTime();
      return validBeginTime <= endTimestamp && validEndTime >= startTimestamp;
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + limit);

    // Group attendance data by date
    const attendanceByDate = paginatedUsers.reduce((acc, user) => {
      // Using the validBeginTime as the attendance date
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
const cameraService = {
  addFacePictureToCamera,
  deleteUserFromCamera,
  updateUserInCamera,
  deleteFacePictureFromCamera,
  addUserToCamera,
  searchUserInCamera,
};

module.exports = cameraService;
