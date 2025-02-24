/**
 * Unified table headers configuration for all user-related views
 * @type {Array<{
 *   key: string,
 *   label: string,
 *   sortable: boolean,
 *   showIf?: (user: any) => boolean,
 *   getValue?: (user: any) => any
 * }>}
 */

const TABLE_HEADERS = {
  COMMON: [
    { field: 'name', headerName: 'Name', width: '150', sortable: true },
    { field: 'username', headerName: 'Username', width: '150', sortable: true },
    { field: 'mobile_number', headerName: 'Mobile Number', width: '150', sortable: false },
    { field: 'role', headerName: 'Role', width: '150', sortable: true },
  ],

  MAIN_VIEW: [
    { field: 'manager', headerName: 'Manager', width: '150', sortable: false },
    { field: 'firm_name', headerName: 'Firm Name', width: '150', sortable: true },
    { field: 'contractors_count', headerName: 'Contractors', width: '150', sortable: false },
    { field: 'photos', headerName: 'Photos', width: '150', sortable: false },
    { field: 'pdfs', headerName: 'Documents', width: '150', sortable: false },
  ],

  PASSWORD_VIEW: [
    { field: 'plainPassword', headerName: 'Password', width: '150', sortable: false },
    { field: 'employeeNo', headerName: 'Employee No', width: '150', sortable: true },
  ],

  META: [{ field: 'createdAt', headerName: 'Created At', width: '150', sortable: true }],
};

/**
 * Get headers for a specific view type with optional additional headers
 * @param {string} viewType - Type of view ('main' or 'password')
 * @param {Array} additionalHeaders - Optional additional headers to include
 * @returns {Array} Combined headers for the view
 */
const getHeadersForView = (viewType, additionalHeaders = []) => {
  switch (viewType) {
    case 'main':
      return [...TABLE_HEADERS.COMMON, ...TABLE_HEADERS.MAIN_VIEW, ...TABLE_HEADERS.META, ...additionalHeaders];
    case 'password':
      return [...TABLE_HEADERS.COMMON, ...TABLE_HEADERS.PASSWORD_VIEW, ...additionalHeaders];
    default:
      return [...TABLE_HEADERS.COMMON, ...additionalHeaders];
  }
};

module.exports = { TABLE_HEADERS, getHeadersForView };
