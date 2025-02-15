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

    JWT_TOKEN = response.data.data.accessToken;
    console.log('Login successful. JWT token:', JWT_TOKEN);
  } catch (error) {
    console.error('Error during login:', error.response ? error.response.data : error.message);
  }
};

/**
 * Get dashboard summary data including counts and today's visits
 * @returns {Object} Dashboard summary data
 */
const getDashboardSummary = async () => {
  if (!JWT_TOKEN) {
    throw new Error('Please login first');
  }

  try {
    const response = await axios.get(`${BASE_URL}/dashboard/summary`, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
    });

    console.log('Dashboard data retrieved successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error getting dashboard data:', error.response?.data || error.message);
    throw error;
  }
};

// Example usage
(async () => {
  try {
    await login('whynotparit', 'b14ck-cyph3R');

    const dashboardData = await getDashboardSummary();
    console.log('Dashboard Summary:', {
      todayVisitCount: dashboardData.summary.todayVisitCount,
      pendingRequestCount: dashboardData.summary.pendingRequestCount,
      monthlyVisitsCount: dashboardData.summary.monthlyVisitsCount,
      approvedVisitsCount: dashboardData.summary.approvedVisitsCount,
    });

    console.log("Today's Visits:", dashboardData.todayVisits);
    console.log('Column Model:', dashboardData.columnModel);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
})();

module.exports = {
  getDashboardSummary,
};
