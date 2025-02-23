const axios = require('axios');
const httpStatus = require('http-status');

const BASE_URL = 'http://localhost:3000/api/v1';
let JWT_TOKEN = null;
let USER_DATA = null;

const login = async (username, password) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username,
      password,
    });

    return response.data.data.accessToken;
  } catch (error) {
    console.error('Error during login:', error.response ? error.response.data : error.message);
  }
};

/**
 * Create a new user
 * @param {Object} userData - Data for the new user
 * @param {string} userData.name - Name of the user
 * @param {string} userData.username - Username (mobile number)
 * @param {string} userData.password - Password
 * @param {string} userData.user_type - User role type
 * @param {string} [userData.mobile_number] - Mobile number
 * @param {string} [userData.department] - Department (for Employee)
 * @param {string} [userData.designation] - Designation (for Employee)
 * @param {number} [userData.plant_id] - Plant ID (for Employee)
 * @param {string} [userData.firm_name] - Firm name (for Contractor)
 * @param {number} [userData.manager_id] - Manager ID (for Contractor)
 * @param {number} [userData.contractor_id] - Contractor ID (for Labour)
 * @param {string} [userData.fingerprint_data] - Fingerprint data (for Labour)
 */
const createUser = async (userData) => {
  if (!JWT_TOKEN) {
    throw new Error('Please login first');
  }

  try {
    const response = await axios.post(`${BASE_URL}/users`, userData, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
    });

    USER_DATA = response.data.data;
    console.log('User created successfully:', USER_DATA);
    return USER_DATA;
  } catch (error) {
    console.error('Error creating user:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Get users with filters
 * @param {Object} filters - Filters for fetching users
 * @param {string} [filters.user_type] - Role name to filter users
 * @param {string} [filters.search] - Search term
 * @param {string} [filters.sortBy] - Field to sort by
 * @param {string} [filters.order] - Sort order (asc/desc)
 * @param {number} [filters.page] - Page number
 * @param {number} [filters.limit] - Items per page
 */
const getUsers = async (filters = {}) => {
  if (!JWT_TOKEN) {
    throw new Error('Please login first');
  }

  try {
    const response = await axios.get(`${BASE_URL}/users`, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
      params: filters,
    });

    console.log('Users retrieved successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error getting users:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Get user by ID
 * @param {number} userId - ID of the user to fetch
 */
const getUserById = async (userId) => {
  if (!JWT_TOKEN) {
    throw new Error('Please login first');
  }

  try {
    const response = await axios.get(`${BASE_URL}/users/${userId}`, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
    });

    console.log('User retrieved successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error getting user:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Delete user by ID
 * @param {number} userId - ID of the user to delete
 */
const deleteUser = async (userId) => {
  if (!JWT_TOKEN) {
    throw new Error('Please login first');
  }

  try {
    const response = await axios.delete(`${BASE_URL}/users/${userId}`, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
    });

    console.log('User deleted successfully');
    return response.data.data;
  } catch (error) {
    console.error('Error deleting user:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Get users with passwords
 * @param {Object} filters - Filters for fetching users with passwords
 * @param {boolean} [filters.manager] - Include managers
 * @param {boolean} [filters.contractor] - Include contractors
 * @param {boolean} [filters.visitor] - Include visitors
 * @param {string} [filters.search] - Search term
 */
const getUsersWithPasswords = async (filters = {}) => {
  if (!JWT_TOKEN) {
    throw new Error('Please login first');
  }

  try {
    const response = await axios.get(`${BASE_URL}/users/passwords`, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
      params: filters,
    });

    console.log('Users with passwords retrieved successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error getting users with passwords:', error.response ? error.response.data : error.message);
    throw error;
  }
};

(async () => {
  try {
    const adminToken = await login('whynotparit', 'b14ck-cyph3R');
    JWT_TOKEN = adminToken;

    const plant = await axios.post(
      `${BASE_URL}/plants`,
      {
        name: 'Test Plant',
      },
      {
        headers: {
          'x-auth-token': adminToken,
        },
      }
    );
    const createdPlant = plant.data.data;

    const manager = await createUser({
      name: 'Test Manager',
      username: '123213141605054',
      password: 'password123',
      user_type: 'MANAGER',
      mobile_number: '123213141605054',
    });

    // const contractor = await createUser({
    //   name: 'Test Contractor',
    //   username: '1',
    //   password: 'password123',
    //   user_type: 'CONTRACTOR',
    //   mobile_number: '1',
    //   firm_name: 'Test Firm',
    //   manager_id: manager.id,
    //   aadhar_number: '123456789012',
    // });

    const employee = await createUser({
      name: 'Test Employee',
      username: '607789709780798',
      password: 'password123',
      user_type: 'EMPLOYEE',
      mobile_number: '607789709780798',
      department: 'IT',
      designation: 'Developer',
      plant_id: createdPlant.id,
    });

    // const labour = await createUser({
    //   name: 'Test Labour',
    //   username: '68706778880',
    //   password: 'password123',
    //   user_type: 'LABOUR',
    //   mobile_number: '68706778880',
    //   fingerprint_data: 'test_fingerprint_data',
    //   aadhar_number: '123456789013',
    // });

    const users = await getUsers({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      order: 'desc',
    });

    const fetchedUser = await getUserById(employee.id);

    const usersWithPasswords = await getUsersWithPasswords({
      manager: true,
      contractor: true,
    });

    await deleteUser(labour.id);

    console.log('All user tests completed successfully');
  } catch (error) {
    console.error('Test Error:', error.response?.data || error.message);
  }
})();

module.exports = {
  createUser,
  getUsers,
  getUserById,
  deleteUser,
  getUsersWithPasswords,
};
