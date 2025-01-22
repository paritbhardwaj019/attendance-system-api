const axios = require('axios');
const httpStatus = require('http-status');

const BASE_URL = 'http://localhost:3000/api/v1';
let JWT_TOKEN = null;

/**
 * Login with username and password to get a JWT token.
 * @param {string} username - Username for login.
 * @param {string} password - Password for login.
 */
const login = async (username, password) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username,
      password,
    });

    console.log('LOGIN RES', response.data.data);

    JWT_TOKEN = response.data.data.accessToken;
    console.log('Login successful. JWT token:', JWT_TOKEN);
  } catch (error) {
    console.error('Error during login:', error.response ? error.response.data : error.message);
  }
};

/**
 * Create a new user.
 * @param {Object} userData - Data for the new user.
 * @param {string} userData.name - Name of the user.
 * @param {string} userData.username - Username for the user.
 * @param {string} userData.password - Password for the user.
 * @param {string} userData.mobile_number - Mobile number of the user.
 * @param {string} userData.user_type - Role of the user (e.g., ADMIN, MANAGER, CONTRACTOR, LABOUR).
 * @param {string} [userData.firm_name] - Firm name for contractor.
 * @param {number} [userData.manager_id] - Manager ID for contractor.
 * @param {number} [userData.contractor_id] - Contractor ID for labour.
 * @param {string} [userData.fingerprint_data] - Fingerprint data for labour.
 */
const createUser = async (userData) => {
  if (!JWT_TOKEN) {
    console.error('Please login first.');
    return;
  }

  try {
    const response = await axios.post(`${BASE_URL}/users`, userData, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
    });

    console.log('User created successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error creating user:', error.response ? error.response.data : error.message);
  }
};

/**
 * Fetch labour report with filters.
 * @param {Object} filters - Filters for fetching the report.
 * @param {string} [filters.labourId] - ID of the labour to filter by.
 * @param {string} [filters.contractorId] - ID of the contractor to filter by.
 * @param {string} [filters.startDate] - Start date for filtering attendance records.
 * @param {string} [filters.endDate] - End date for filtering attendance records.
 * @param {string} [filters.sortBy] - Field to sort by (e.g., 'date', 'inTime', 'outTime').
 * @param {string} [filters.order] - Order of sorting ('asc' or 'desc').
 * @param {number} [filters.page] - Page number for pagination.
 * @param {number} [filters.limit] - Number of records per page.
 */
const fetchLabourReport = async (filters = {}) => {
  if (!JWT_TOKEN) {
    console.error('Please login first.');
    return;
  }

  try {
    const response = await axios.get(`${BASE_URL}/reports`, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
      params: filters,
    });

    console.log('Labour Report:', response.data.data.data);
  } catch (error) {
    console.error('Error fetching labour report:', error.response ? error.response.data : error.message);
  }
};

/**
 * Fetch detailed labour report by labour ID.
 * @param {number} labourId - ID of the labour to fetch the report for.
 * @param {Object} filters - Filters for fetching the report.
 * @param {string} [filters.startDate] - Start date for filtering attendance records.
 * @param {string} [filters.endDate] - End date for filtering attendance records.
 */
const fetchLabourReportById = async (labourId, filters = {}) => {
  if (!JWT_TOKEN) {
    console.error('Please login first.');
    return;
  }

  try {
    const response = await axios.get(`${BASE_URL}/reports/${labourId}`, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
      params: filters,
    });

    console.log('Detailed Labour Report:', response.data.data.data);
  } catch (error) {
    console.error('Error fetching detailed labour report:', error.response ? error.response.data : error.message);
  }
};

/**
 * Fetch contractor-wise labour working hours report.
 * @param {Object} filters - Filters for fetching the report.
 * @param {string} [filters.startDate] - Start date for filtering attendance records.
 * @param {string} [filters.endDate] - End date for filtering attendance records.
 */
const fetchContractorLabourReport = async (filters = {}) => {
  if (!JWT_TOKEN) {
    console.error('Please login first.');
    return;
  }

  try {
    const response = await axios.get(`${BASE_URL}/reports/contractor`, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
      params: filters,
    });

    console.log('Contractor Labour Report:', response.data.data.data);
  } catch (error) {
    console.error('Error fetching contractor labour report:', error.response ? error.response.data : error.message);
  }
};

/**
 * Fetch attendance records.
 * @param {Object} filters - Filters for fetching attendance records.
 * @param {string} [filters.startDate] - Start date for filtering attendance records.
 * @param {string} [filters.endDate] - End date for filtering attendance records.
 */
const fetchAttendance = async (filters = {}) => {
  if (!JWT_TOKEN) {
    console.error('Please login first.');
    return;
  }

  try {
    const response = await axios.get(`${BASE_URL}/camera/attendance`, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
      params: filters,
    });

    console.log('Attendance Records:', response.data.data.results);
  } catch (error) {
    console.error('Error fetching attendance records:', error.response ? error.response.data : error.message);
  }
};

(async () => {
  await login('whynotparit', 'b14ck-cyph3R');

  // await createUser({
  //   name: 'John Doe',
  //   username: 'johndoe',
  //   password: 'password123',
  //   mobile_number: '1234567890',
  //   user_type: 'MANAGER',
  // });

  // await fetchLabourReport({
  //   contractorId: 2,
  //   startDate: '2025-01-18',
  //   endDate: '2025-01-20',
  //   sortBy: 'date',
  //   order: 'asc',
  //   page: 1,
  //   limit: 10,
  // });

  // await fetchLabourReportById(6, {
  //   startDate: '2025-01-01',
  //   endDate: '2025-01-31',
  // });

  // await fetchContractorLabourReport({
  //   startDate: '2025-01-20',
  //   endDate: '2025-01-20',
  // });

  // await fetchAttendance({
  //   startDate: '2025-01-22',
  //   endDate: '2025-01-22',
  //   // contractorId: 1,
  // });
})();
