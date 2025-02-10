const axios = require('axios');
const httpStatus = require('http-status');

// const BASE_URL = 'http://ec2-15-207-115-92.ap-south-1.compute.amazonaws.com:3000/api/v1';
const BASE_URL = 'http://localhost:3000/api/v1';
let JWT_TOKEN = null;

/**
 * Signup a new visitor
 * @param {Object} visitorData - Data for the new visitor signup
 * @param {string} visitorData.name - Name of the visitor
 * @param {string} visitorData.mobile_number - Mobile number of the visitor
 * @param {string} visitorData.password - Password for the visitor account
 */
const visitorSignup = async (visitorData) => {
  try {
    const response = await axios.post(`${BASE_URL}/visitor-auth/signup`, visitorData);

    console.log('Visitor Signup Response:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error during visitor signup:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Login for visitor with mobile number and password
 * @param {Object} loginData - Login credentials
 * @param {string} loginData.mobile_number - Mobile number of the visitor
 * @param {string} loginData.password - Password for the visitor account
 */
const visitorLogin = async (loginData) => {
  try {
    const response = await axios.post(`${BASE_URL}/visitor-auth/login`, loginData);

    console.log('LOGIN RES', response.data.data);

    JWT_TOKEN = response.data.data.accessToken;
    console.log('Visitor login successful. JWT token:', JWT_TOKEN);

    return response.data.data;
  } catch (error) {
    console.error('Error during visitor login:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Register a new visitor request
 * @param {Object} visitorRequestData - Data for the visitor request
 * @param {string} visitorRequestData.name - Name of the visitor
 * @param {string} visitorRequestData.contact - Contact number of the visitor
 * @param {string} visitorRequestData.email - Email of the visitor
 * @param {string} visitorRequestData.visitPurpose - Purpose of the visit
 * @param {string} visitorRequestData.visitDate - Date of the visit
 */
const registerVisitorRequest = async (visitorRequestData) => {
  if (!JWT_TOKEN) {
    console.error('Please login first.');
    return;
  }

  try {
    const response = await axios.post(`${BASE_URL}/visitor/register`, visitorRequestData, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
    });

    console.log(response.data);

    console.log('Visitor request registered successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error registering visitor request:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Get visitor status by ticket ID or name
 * @param {string} identifier - Ticket ID or name of the visitor
 */
const getVisitorStatus = async (identifier) => {
  try {
    const response = await axios.get(`${BASE_URL}/visitor/status/${identifier}`);

    console.log('Visitor Status:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching visitor status:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * List visitor requests with optional filtering
 * @param {Object} filters - Filters for fetching visitor requests
 * @param {string} [filters.status] - Status of the visitor requests
 * @param {string} [filters.startDate] - Start date for filtering
 * @param {string} [filters.endDate] - End date for filtering
 */
const listVisitorRequests = async (filters = {}) => {
  if (!JWT_TOKEN) {
    console.error('Please login first.');
    return;
  }

  try {
    const response = await axios.get(`${BASE_URL}/visitor`, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
      params: filters,
    });

    console.log('Visitor Requests:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching visitor requests:', error.response ? error.response.data : error.message);
    throw error;
  }
};

const handleVisitorEntry = async (ticketId) => {
  const response = await axios.post(
    `${BASE_URL}/visitor/${ticketId}/entry`,
    {},
    {
      headers: { 'x-auth-token': JWT_TOKEN },
    }
  );
  return response.data.data;
};

const getVisitorRecords = async (filters = {}) => {
  if (!JWT_TOKEN) throw new Error('Please login first');

  const response = await axios.get(`${BASE_URL}/visitor/records`, {
    headers: { 'x-auth-token': JWT_TOKEN },
    params: filters,
  });
  console.log(response.data.data);

  return response.data.data;
};

// Example usage
(async () => {
  try {
    // await visitorSignup({
    //   name: 'Test Visitor',
    //   mobile_number: '8057527852',
    //   password: 'password123',
    // });

    // Login
    // await visitorLogin({
    //   mobile_number: '8057527852',
    //   password: 'password123',
    // });

    // Register visit
    // await registerVisitorRequest({
    //   name: 'Test Visitor',
    //   contact: '8057527852',
    //   email: 'test@example.com',
    //   visitPurpose: 'Meeting',
    //   startDate: '2025-02-15',
    // });

    // Handle entry/exit
    await handleVisitorEntry('VIS-DBBC3F77');

    // // Get records
    // await getVisitorRecords({
    //   startDate: '2025-02-10',
    //   endDate: '2025-02-15',
    // });
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
})();

module.exports = {
  visitorSignup,
  visitorLogin,
  registerVisitorRequest,
  getVisitorStatus,
  listVisitorRequests,
};
