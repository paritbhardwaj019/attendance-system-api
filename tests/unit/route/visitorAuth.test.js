const axios = require('axios');
const httpStatus = require('http-status');

// const BASE_URL = 'http://ec2-15-207-115-92.ap-south-1.compute.amazonaws.com:3000/api/v1';
// const BASE_URL = 'https://15.207.115.92.nip.io/api/v1';
const BASE_URL = 'http://localhost:3000/api/v1';
let JWT_TOKEN = null;
let VISITOR_DATA = null;

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
    throw new Error('Please login first');
  }

  try {
    const response = await axios.post(`${BASE_URL}/visitor/register`, visitorRequestData, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
    });

    VISITOR_DATA = response.data.data;
    console.log('Visitor request registered successfully:', VISITOR_DATA);
    return VISITOR_DATA;
  } catch (error) {
    console.error('Error registering visitor request:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Process (approve/reject) a visitor request
 * @param {string} ticketId - Ticket ID of the visitor request
 * @param {string} status - New status (APPROVED/REJECTED)
 * @param {string} remarks - Remarks for the status change
 */
const processVisitorRequest = async (ticketId, status, remarks, token) => {
  if (!JWT_TOKEN) {
    throw new Error('Please login first');
  }

  try {
    const response = await axios.put(
      `${BASE_URL}/visitor/${ticketId}/process`,
      { status, remarks },
      {
        headers: {
          'x-auth-token': token,
        },
      }
    );

    console.log('Visitor request processed successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error processing visitor request:', error.response ? error.response.data : error.message);
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

  return response.data.data;
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

    await visitorSignup({
      name: 'Test Visitor',
      mobile_number: '80575278533',
      password: 'password123',
    });

    const visitorLoginResponse = await visitorLogin({
      mobile_number: '80575278533',
      password: 'password123',
    });

    JWT_TOKEN = visitorLoginResponse.accessToken;

    const visitorRequest = await registerVisitorRequest({
      name: 'Test Visitor',
      contact: '80575278533',
      email: 'test@example.com',
      visitPurpose: 'Meeting',
      startDate: '2025-02-17',
      plantId: createdPlant.id,
      meetingWith: 'Plant Head',
      companyName: 'Test Company',
    });

    if (visitorRequest.ticketId) {
      JWT_TOKEN = adminToken;

      await processVisitorRequest(visitorRequest.ticketId, 'APPROVED', 'Approved by admin', adminToken);

      await handleVisitorEntry(visitorRequest.ticketId);

      const records = await getVisitorRecords({
        startDate: '2025-02-15',
        endDate: '2025-02-20',
      });

      const requests = await listVisitorRequests();

      console.log('Visitor Records:', records);
      console.log('Visitor Requests:', requests);
    }
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
