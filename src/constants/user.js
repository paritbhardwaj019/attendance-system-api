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
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      getValue: (user) => user.name,
    },
    {
      key: 'username',
      label: 'Username',
      sortable: true,
      getValue: (user) => user.username,
    },
    {
      key: 'mobile_number',
      label: 'Mobile Number',
      sortable: false,
      getValue: (user) => user.mobile_number,
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      getValue: (user) => user.role.name,
    },
  ],

  MAIN_VIEW: [
    {
      key: 'manager',
      label: 'Manager',
      sortable: false,
      showIf: (user) => user.contractor?.manager || user.manager,
      getValue: (user) => {
        if (user.contractor?.manager) {
          return user.contractor.manager.user.name;
        }
        if (user.manager) {
          return user.manager.user.name;
        }
        return null;
      },
    },
    {
      key: 'firm_name',
      label: 'Firm Name',
      sortable: true,
      showIf: (user) => user.contractor,
      getValue: (user) => user.contractor?.firm_name,
    },
    {
      key: 'contractors_count',
      label: 'Contractors',
      sortable: false,
      showIf: (user) => user.manager,
      getValue: (user) => user.manager?._count?.contractors || 0,
    },
    {
      key: 'photos',
      label: 'Photos',
      sortable: false,
      showIf: (user) => user.contractor?.photos || user.labour?.photos,
      getValue: (user) => {
        const photos = user.contractor?.photos || user.labour?.photos || [];
        return photos.length;
      },
    },
    {
      key: 'pdfs',
      label: 'Documents',
      sortable: false,
      showIf: (user) => user.contractor?.pdfs || user.labour?.pdfs,
      getValue: (user) => {
        const pdfs = user.contractor?.pdfs || user.labour?.pdfs || [];
        return pdfs.length;
      },
    },
  ],

  PASSWORD_VIEW: [
    {
      key: 'plainPassword',
      label: 'Password',
      sortable: false,
      getValue: (user) => {
        return user.encryptedPlainPassword === '-'
          ? '-'
          : user.encryptedPlainPassword
          ? decrypt(user.encryptedPlainPassword)
          : null;
      },
    },
    {
      key: 'employeeNo',
      label: 'Employee No',
      sortable: true,
      getValue: (user) => user.manager?.employeeNo || user.contractor?.employeeNo,
    },
  ],

  META: [
    {
      key: 'createdAt',
      label: 'Created At',
      sortable: true,
      getValue: (user) => user.createdAt,
    },
  ],
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
