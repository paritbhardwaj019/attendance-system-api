const TABLE_HEADERS = {
  VISITOR_RECORDS: [
    { field: 'ticketId', headerName: 'Ticket ID', width: '130', sortable: true },
    { field: 'visitorName', headerName: 'Visitor Name', width: '150', sortable: true },
    { field: 'contact', headerName: 'Contact', width: '130', sortable: true },
    { field: 'plantName', headerName: 'Plant', width: '150', sortable: true },
    { field: 'dateOfVisit', headerName: 'Visit Date', width: '130', sortable: true },
    { field: 'entryTime', headerName: 'Entry Time', width: '130', sortable: true },
    { field: 'exitTime', headerName: 'Exit Time', width: '130', sortable: true },
  ],

  VISITOR_REQUESTS: [
    { field: 'ticketId', headerName: 'Ticket ID', width: '130', sortable: true },
    { field: 'name', headerName: 'Visitor Name', width: '150', sortable: true },
    { field: 'contact', headerName: 'Contact', width: '130', sortable: true },
    { field: 'companyName', headerName: 'Company', width: '150', sortable: true },
    { field: 'visitPurpose', headerName: 'Purpose', width: '200', sortable: true },
    { field: 'status', headerName: 'Status', width: '100', sortable: true },
    { field: 'startDate', headerName: 'Visit Date', width: '130', sortable: true },
    { field: 'requestTime', headerName: 'Request Time', width: '130', sortable: true },
    { field: 'photos', headerName: 'Photos', width: '100', sortable: false },
    { field: 'process', headerName: 'Process', width: '100', sortable: false },
    { field: 'handleEntry', headerName: 'Entry/Exit', width: '100', sortable: false },
  ],
};

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
 * Transform data according to headers with photo URLs included
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

    if (item.photos) {
      transformed.photos = item.photos.map((photo) => photo.url);
    }

    return transformed;
  });
};

module.exports = { TABLE_HEADERS, transformData, getHeadersForView };
