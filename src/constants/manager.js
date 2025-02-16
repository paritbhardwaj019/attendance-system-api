const TABLE_HEADERS = {
  COMMON: [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      getValue: (entity) => entity.user.name,
    },
    {
      key: 'username',
      label: 'Username',
      sortable: true,
      getValue: (entity) => entity.user.username,
    },
    {
      key: 'mobile_number',
      label: 'Mobile Number',
      sortable: false,
      getValue: (entity) => entity.user.mobile_number,
    },
    {
      key: 'employeeNo',
      label: 'Employee No',
      sortable: true,
      getValue: (entity) => entity.employeeNo,
    },
  ],

  CONTRACTOR: [
    {
      key: 'firm_name',
      label: 'Firm Name',
      sortable: true,
      getValue: (contractor) => contractor.firm_name,
    },
    {
      key: 'manager',
      label: 'Manager',
      sortable: false,
      showIf: (contractor) => contractor.manager,
      getValue: (contractor) => contractor.manager?.user.name,
    },
    {
      key: 'aadhar_number',
      label: 'Aadhar Number',
      sortable: true,
      getValue: (contractor) => contractor.aadhar_number,
    },
    {
      key: 'site_details',
      label: 'Site Details',
      sortable: true,
      getValue: (contractor) => contractor.siteCode,
    },
  ],

  LABOUR: [
    {
      key: 'contractor',
      label: 'Contractor',
      sortable: false,
      showIf: (labour) => labour.contractor,
      getValue: (labour) => labour.contractor?.user.name,
    },
    {
      key: 'contractor_firm',
      label: 'Firm Name',
      sortable: false,
      showIf: (labour) => labour.contractor,
      getValue: (labour) => labour.contractor?.firm_name,
    },
    {
      key: 'aadhar_number',
      label: 'Aadhar Number',
      sortable: true,
      getValue: (labour) => labour.aadhar_number,
    },
  ],

  DOCUMENTS: [
    {
      key: 'photos',
      label: 'Photos',
      sortable: false,
      getValue: (entity) => entity.photos?.length || 0,
    },
    {
      key: 'pdfs',
      label: 'Documents',
      sortable: false,
      getValue: (entity) => entity.pdfs?.length || 0,
    },
  ],

  META: [
    {
      key: 'created_by',
      label: 'Created By',
      sortable: false,
      getValue: (entity) => entity.createdBy?.name,
    },
    {
      key: 'createdAt',
      label: 'Created At',
      sortable: true,
      getValue: (entity) => entity.createdAt,
    },
  ],
};

/**
 * Get headers for a specific entity type with optional additional headers
 */
const getHeadersForEntity = (entityType, additionalHeaders = []) => {
  switch (entityType) {
    case 'contractor':
      return [
        ...TABLE_HEADERS.COMMON,
        ...TABLE_HEADERS.CONTRACTOR,
        ...TABLE_HEADERS.DOCUMENTS,
        ...TABLE_HEADERS.META,
        ...additionalHeaders,
      ];
    case 'labour':
      return [
        ...TABLE_HEADERS.COMMON,
        ...TABLE_HEADERS.LABOUR,
        ...TABLE_HEADERS.DOCUMENTS,
        ...TABLE_HEADERS.META,
        ...additionalHeaders,
      ];
    default:
      return [...TABLE_HEADERS.COMMON, ...additionalHeaders];
  }
};

module.exports = { TABLE_HEADERS, getHeadersForEntity };
