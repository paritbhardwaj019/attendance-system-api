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
      field: 'name',
      headerName: 'Name',
      width: '150',
      sortable: true,
      getValue: (user) => user.name,
    },
    {
      field: 'username',
      headerName: 'Username',
      width: '150',
      sortable: true,
      getValue: (user) => user.username,
    },
    {
      field: 'mobile_number',
      headerName: 'Mobile Number',
      width: '150',
      sortable: false,
      getValue: (user) => user.mobile_number,
    },
    {
      field: 'role',
      headerName: 'Role',
      width: '150',
      sortable: true,
      getValue: (user) => user.role?.name,
    },
    {
      field: 'employeeNo',
      headerName: 'Employee No',
      width: '150',
      sortable: true,
      getValue: (user) =>
        user.admin?.employeeNo ||
        user.manager?.employeeNo ||
        user.contractor?.employeeNo ||
        user.labour?.employeeNo ||
        user.employee?.employeeNo,
    },
  ],

  MAIN_VIEW: [
    {
      field: 'manager',
      headerName: 'Manager',
      width: '150',
      sortable: false,
      getValue: (user) => user.manager?.user?.name || user.contractor?.manager?.user?.name,
    },
    {
      field: 'firm_name',
      headerName: 'Firm Name',
      width: '150',
      sortable: true,
      getValue: (user) => user.contractor?.firm_name,
      showIf: (user) => Boolean(user.contractor),
    },
    {
      field: 'contractors_count',
      headerName: 'Contractors',
      width: '150',
      sortable: false,
      getValue: (user) => user.manager?._count?.contractors || 0,
      showIf: (user) => Boolean(user.manager),
    },
    {
      field: 'photos',
      headerName: 'Photos',
      width: '150',
      sortable: false,
      getValue: (user) => {
        const contractorPhotos = user.contractor?.photos || [];
        const labourPhotos = user.labour?.photos || [];
        const employeePhotos = user.employee?.photos || [];
        return [...contractorPhotos, ...labourPhotos, ...employeePhotos];
      },
      showIf: (user) => Boolean(user.contractor || user.labour || user.employee),
    },
    {
      field: 'pdfs',
      headerName: 'Documents',
      width: '150',
      sortable: false,
      getValue: (user) => {
        const contractorDocs = user.contractor?.pdfs || [];
        const labourDocs = user.labour?.pdfs || [];
        return [...contractorDocs, ...labourDocs];
      },
      showIf: (user) => Boolean(user.contractor || user.labour),
    },
    {
      field: 'email',
      headerName: 'Email',
      width: '200',
      sortable: true,
      getValue: (user) => user.employee?.email,
      showIf: (user) => Boolean(user.employee),
    },
  ],

  PASSWORD_VIEW: [
    {
      field: 'plainPassword',
      headerName: 'Password',
      width: '150',
      sortable: false,
      getValue: (user) => user.plainPassword,
    },
  ],

  META: [
    {
      field: 'createdAt',
      headerName: 'Created At',
      width: '150',
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
