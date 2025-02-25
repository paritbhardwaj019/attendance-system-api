const TABLE_HEADERS = {
  COMMON: [
    { field: 'employeeNo', headerName: 'Employee No', width: '150', sortable: true },
    { field: 'name', headerName: 'Name', width: '150', sortable: true },
    { field: 'username', headerName: 'Username', width: '150', sortable: true },
    { field: 'mobile_number', headerName: 'Mobile Number', width: '150', sortable: false },
  ],

  CONTRACTOR: [
    { field: 'firm_name', headerName: 'Firm Name', width: '150', sortable: true },
    { field: 'manager', headerName: 'Manager', width: '150', sortable: false },
    { field: 'aadhar_number', headerName: 'Aadhar Number', width: '150', sortable: true },
    { field: 'site_details', headerName: 'Site Details', width: '150', sortable: true },
  ],

  LABOUR: [
    { field: 'contractor', headerName: 'Contractor', width: '150', sortable: false },
    { field: 'contractor_firm', headerName: 'Firm Name', width: '150', sortable: false },
    { field: 'aadhar_number', headerName: 'Aadhar Number', width: '150', sortable: true },
  ],

  DOCUMENTS: [
    { field: 'photos', headerName: 'Photos', width: '150', sortable: false },
    { field: 'pdfs', headerName: 'Documents', width: '150', sortable: false },
  ],

  META: [
    { field: 'created_by', headerName: 'Created By', width: '150', sortable: false },
    { field: 'createdAt', headerName: 'Created At', width: '150', sortable: true },
  ],
};

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
