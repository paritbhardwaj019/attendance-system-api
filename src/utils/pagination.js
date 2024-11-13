/**
 * Calculates skip and take values for pagination.
 * @param {number} page - Current page number.
 * @param {number} limit - Number of items per page.
 * @returns {Object} - Contains skip and take values.
 */

const getPagination = (page, limit) => {
  const currentPage = page > 0 ? page : 1;
  const perPage = limit > 0 ? limit : 10;
  const skip = (currentPage - 1) * perPage;
  return { skip, take: perPage, page };
};

module.exports = { getPagination };
