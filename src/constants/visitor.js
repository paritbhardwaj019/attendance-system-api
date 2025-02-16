const TABLE_HEADERS = {
  VISITOR_RECORDS: [
    {
      key: 'ticketId',
      label: 'Ticket ID',
      width: 130,
      sortable: true,
      getValue: (record) => record.visitor.ticketId,
    },
    {
      key: 'visitorName',
      label: 'Visitor Name',
      width: 150,
      sortable: true,
      getValue: (record) => record.visitor.name,
    },
    {
      key: 'contact',
      label: 'Contact',
      width: 130,
      sortable: true,
      getValue: (record) => record.visitor.contact,
    },
    {
      key: 'plantName',
      label: 'Plant',
      width: 150,
      sortable: true,
      getValue: (record) => record.plant.name,
    },
    {
      key: 'dateOfVisit',
      label: 'Visit Date',
      width: 130,
      sortable: true,
      getValue: (record) => record.dateOfVisit,
    },
    {
      key: 'entryTime',
      label: 'Entry Time',
      width: 130,
      sortable: true,
      getValue: (record) => record.entryTime,
    },
    {
      key: 'exitTime',
      label: 'Exit Time',
      width: 130,
      sortable: true,
      getValue: (record) => record.exitTime,
    },
  ],

  // Headers for visitor requests list
  VISITOR_REQUESTS: [
    {
      key: 'ticketId',
      label: 'Ticket ID',
      width: 130,
      sortable: true,
      getValue: (visitor) => visitor.ticketId,
    },
    {
      key: 'name',
      label: 'Visitor Name',
      width: 150,
      sortable: true,
      getValue: (visitor) => visitor.name,
    },
    {
      key: 'contact',
      label: 'Contact',
      width: 130,
      sortable: true,
      getValue: (visitor) => visitor.contact,
    },
    {
      key: 'companyName',
      label: 'Company',
      width: 150,
      sortable: true,
      getValue: (visitor) => visitor.companyName,
    },
    {
      key: 'visitPurpose',
      label: 'Purpose',
      width: 200,
      sortable: true,
      getValue: (visitor) => visitor.visitPurpose,
    },
    {
      key: 'status',
      label: 'Status',
      width: 100,
      sortable: true,
      getValue: (visitor) => visitor.status,
    },
    {
      key: 'startDate',
      label: 'Visit Date',
      width: 130,
      sortable: true,
      getValue: (visitor) => visitor.startDate,
    },
    {
      key: 'requestTime',
      label: 'Request Time',
      width: 130,
      sortable: true,
      getValue: (visitor) => visitor.requestTime,
    },
    {
      key: 'photos',
      label: 'Photos',
      width: 100,
      sortable: false,
      getValue: (visitor) => visitor.photos?.length || 0,
    },
  ],
};

/**
 * Get headers for a specific view type
 */
const getHeadersForView = (viewType) => {
  switch (viewType.toLowerCase()) {
    case 'records':
      return TABLE_HEADERS.VISITOR_RECORDS;
    case 'requests':
      return TABLE_HEADERS.VISITOR_REQUESTS;
    default:
      return [];
  }
};

/**
 * Transform data according to headers
 */
const transformData = (data, viewType) => {
  const headers = getHeadersForView(viewType);

  return data.map((item) => {
    const transformed = {
      id: item.id,
    };

    headers.forEach((header) => {
      transformed[header.key] = header.getValue(item);
    });

    return transformed;
  });
};

module.exports = { TABLE_HEADERS, transformData, getHeadersForView };
