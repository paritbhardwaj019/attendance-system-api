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
 * Create a new plant
 * @param {Object} plantData - Data for the new plant
 * @param {string} plantData.name - Name of the plant
 * @param {string} plantData.plantHead - Name of plant head
 * @param {number} plantData.plantHeadId - User ID of plant head
 */
const createPlant = async (plantData) => {
  if (!JWT_TOKEN) {
    throw new Error('Please login first');
  }

  try {
    const response = await axios.post(`${BASE_URL}/plants`, plantData, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
    });

    console.log('Plant created successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error creating plant:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Update plant details
 * @param {number} plantId - ID of the plant to update
 * @param {Object} updateData - Data to update
 */
const updatePlant = async (plantId, updateData) => {
  if (!JWT_TOKEN) {
    throw new Error('Please login first');
  }

  try {
    const response = await axios.put(`${BASE_URL}/plants/${plantId}`, updateData, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
    });

    console.log('Plant updated successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error updating plant:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Delete a plant
 * @param {number} plantId - ID of the plant to delete
 */
const deletePlant = async (plantId) => {
  if (!JWT_TOKEN) {
    throw new Error('Please login first');
  }

  try {
    const response = await axios.delete(`${BASE_URL}/plants/${plantId}`, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
    });

    console.log('Plant deleted successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error deleting plant:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get all plants with optional filtering
 * @param {Object} filters - Filter options
 * @param {string} filters.name - Filter by plant name
 * @param {string} filters.code - Filter by plant code
 * @param {number} filters.plantHeadId - Filter by plant head
 */
const getPlants = async (filters = {}) => {
  if (!JWT_TOKEN) {
    throw new Error('Please login first');
  }

  try {
    const response = await axios.get(`${BASE_URL}/plants`, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
      params: filters,
    });

    console.log('Plants retrieved successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error getting plants:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Add user to plant access
 * @param {number} plantId - Plant ID
 * @param {number} userId - User ID to add
 * @param {boolean} hasAllAccess - Whether user should have all access
 */
const addPlantMember = async (plantId, userId, hasAllAccess = false) => {
  if (!JWT_TOKEN) {
    throw new Error('Please login first');
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/plants/${plantId}/members`,
      { userId, hasAllAccess },
      {
        headers: {
          'x-auth-token': JWT_TOKEN,
        },
      }
    );

    console.log('Plant member added successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error adding plant member:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Remove user from plant access
 * @param {number} plantId - Plant ID
 * @param {number} userId - User ID to remove
 */
const removePlantMember = async (plantId, userId) => {
  if (!JWT_TOKEN) {
    throw new Error('Please login first');
  }

  try {
    const response = await axios.delete(`${BASE_URL}/plants/${plantId}/members/${userId}`, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
    });

    console.log('Plant member removed successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error removing plant member:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get plant visitor requests
 * @param {number} plantId - Plant ID
 * @param {Object} filters - Filter options
 */
const getPlantVisitorRequests = async (plantId, filters = {}) => {
  if (!JWT_TOKEN) {
    throw new Error('Please login first');
  }

  try {
    const response = await axios.get(`${BASE_URL}/plants/${plantId}/visitors`, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
      params: filters,
    });

    console.log('Plant visitor requests retrieved successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error getting plant visitor requests:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Check plant access for a user
 * @param {number} plantId - Plant ID
 */
const checkPlantAccess = async (plantId, userId) => {
  if (!JWT_TOKEN) {
    throw new Error('Please login first');
  }

  try {
    const response = await axios.get(`${BASE_URL}/plants/${plantId}/access?userId=${userId}`, {
      headers: {
        'x-auth-token': JWT_TOKEN,
      },
    });

    console.log('Plant access checked successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error checking plant access:', error.response?.data || error.message);
    throw error;
  }
};

(async () => {
  try {
    await login('whynotparit', 'b14ck-cyph3R');

    const plant = await createPlant({
      name: 'Test Plant',
      plantHead: 'John Doe',
    });

    const plants = await getPlants();

    await updatePlant(plant.id, {
      name: 'Updated Plant Name',
    });

    await addPlantMember(plant.id, 1, true);

    await getPlantVisitorRequests(plant.id, {
      status: 'PENDING',
    });

    await checkPlantAccess(plant.id, 1);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
})();

module.exports = {
  createPlant,
  updatePlant,
  deletePlant,
  getPlants,
  addPlantMember,
  removePlantMember,
  getPlantVisitorRequests,
  checkPlantAccess,
};
