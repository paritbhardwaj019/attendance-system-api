const axios = require('axios');
const httpStatus = require('http-status');

const BASE_URL = 'https://15.207.115.92.nip.io/api/v1';
let JWT_TOKEN = null;
let MEAL_DATA = null;

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
 * Create a new meal
 * @param {Object} mealData - Data for the new meal
 * @param {string} mealData.name - Name of the meal
 * @param {number} mealData.price - Price of the meal
 */
const createMeal = async (mealData) => {
  if (!JWT_TOKEN) {
    throw new Error('Please login first');
  }

  try {
    const response = await axios.post(`${BASE_URL}/meals`, mealData, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
    });

    MEAL_DATA = response.data.data;
    console.log('Meal created successfully:', MEAL_DATA);
    return MEAL_DATA;
  } catch (error) {
    console.error('Error creating meal:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Get all meals
 */
const getMeals = async () => {
  if (!JWT_TOKEN) {
    throw new Error('Please login first');
  }

  try {
    const response = await axios.get(`${BASE_URL}/meals`, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
    });

    console.log('Meals retrieved successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error getting meals:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Request a meal
 * @param {Object} requestData - Data for the meal request
 * @param {number} requestData.mealId - ID of the meal
 * @param {number} requestData.quantity - Quantity of meals
 * @param {number} requestData.plantId - ID of the plant
 */
const requestMeal = async (requestData) => {
  if (!JWT_TOKEN) {
    throw new Error('Please login first');
  }

  try {
    const response = await axios.post(`${BASE_URL}/meals/request`, requestData, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
    });

    console.log('Meal request created successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error requesting meal:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Process a meal request
 * @param {string} ticketId - Ticket ID of the meal request
 * @param {string} status - New status (APPROVED/REJECTED)
 * @param {string} remarks - Remarks for the status change
 */
const processMealRequest = async (ticketId, status, remarks, token = JWT_TOKEN) => {
  if (!token) {
    throw new Error('Please login first');
  }

  try {
    const response = await axios.put(
      `${BASE_URL}/meals/request/${ticketId}/process`,
      { status, remarks },
      {
        headers: {
          'x-auth-token': token,
        },
      }
    );

    console.log('Meal request processed successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error processing meal request:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Handle meal entry (serving/consumption)
 * @param {string} ticketId - Ticket ID of the meal request
 */
const handleMealEntry = async (ticketId) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/meals/request/${ticketId}/entry`,
      {},
      {
        headers: { 'x-auth-token': JWT_TOKEN },
      }
    );
    return response.data.data;
  } catch (error) {
    console.error('Error handling meal entry:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Get meal records
 * @param {Object} filters - Filters for fetching meal records
 * @param {string} filters.startDate - Start date for filtering
 * @param {string} filters.endDate - End date for filtering
 * @param {number} filters.plantId - Plant ID for filtering
 */
const getMealRecords = async (filters = {}) => {
  if (!JWT_TOKEN) throw new Error('Please login first');

  try {
    const response = await axios.get(`${BASE_URL}/meals/records`, {
      headers: { 'x-auth-token': JWT_TOKEN },
      params: filters,
    });

    console.log('Meal records retrieved successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error getting meal records:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Get meal dashboard data
 * @param {Object} filters - Filters for fetching dashboard data
 * @param {number} filters.plantId - Optional plant ID for filtering data
 */
const getMealDashboard = async (filters = {}) => {
  if (!JWT_TOKEN) throw new Error('Please login first');

  try {
    const response = await axios.get(`${BASE_URL}/meals/dashboard`, {
      headers: { 'x-auth-token': JWT_TOKEN },
      params: filters,
    });

    console.log('Meal dashboard data retrieved successfully:', response.data.data?.todayRequests.headers);
    console.log('MEAL TODAY HEADERS', response.data.data?.todayRequests.headers);
    console.log('MEAL TODAY DATA', response.data.data?.todayRequests.data);

    return response.data.data;
  } catch (error) {
    console.error('Error getting meal dashboard:', error.response ? error.response.data : error.message);
    throw error;
  }
};

(async () => {
  try {
    const adminToken = await login('8983631618', 'Test@123');
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

    const meal = await createMeal({
      name: 'Test Meal',
      price: 150,
    });

    const meals = await getMeals();

    const mealRequest = await requestMeal({
      mealId: meal.id,
      quantity: 2,
      plantId: createdPlant.id,
    });

    if (mealRequest.ticketId) {
      await processMealRequest(mealRequest.ticketId, 'APPROVED', 'Approved by admin', adminToken);

      // await handleMealEntry(mealRequest.ticketId);

      const records = await getMealRecords({
        startDate: '2025-02-15',
        endDate: '2025-02-25',
        plantId: createdPlant.id,
      });

      const dashboardData = await getMealDashboard();
      console.log('Dashboard data for all plants:', dashboardData);

      console.log('Test completed successfully');
    }
  } catch (error) {
    console.error('Test Error:', error.response?.data || error.message);
  }
})();

module.exports = {
  createMeal,
  getMeals,
  requestMeal,
  processMealRequest,
  handleMealEntry,
  getMealRecords,
};
