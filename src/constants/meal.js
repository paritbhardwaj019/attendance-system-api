const TABLE_HEADERS = {
  requests: [
    { key: 'ticketId', label: 'Ticket ID', width: 150, sortable: true },
    { key: 'mealName', label: 'Meal', width: 200, sortable: true },
    { key: 'quantity', label: 'Quantity', width: 100, sortable: true },
    { key: 'price', label: 'Price', width: 100, sortable: true },
    { key: 'status', label: 'Status', width: 120, sortable: true },
    { key: 'requestedBy', label: 'Requested By', width: 150, sortable: true },
    { key: 'plantName', label: 'Plant', width: 150, sortable: true },
    { key: 'requestTime', label: 'Request Time', width: 180, sortable: true },
    { key: 'remarks', label: 'Remarks', width: 200, sortable: true },
  ],
  records: [
    { key: 'ticketId', label: 'Ticket ID', width: 150, sortable: true },
    { key: 'mealName', label: 'Meal', width: 200, sortable: true },
    { key: 'quantity', label: 'Quantity', width: 100, sortable: true },
    { key: 'requestedBy', label: 'Requested By', width: 150, sortable: true },
    { key: 'plantName', label: 'Plant', width: 150, sortable: true },
    { key: 'serveTime', label: 'Serve Time', width: 180, sortable: true },
    { key: 'consumeTime', label: 'Consume Time', width: 180, sortable: true },
    { key: 'status', label: 'Status', width: 120, sortable: true },
  ],
};

const transformData = (data, view) => {
  switch (view) {
    case 'requests':
      return data.map((item) => ({
        id: item.id,
        ticketId: item.ticketId,
        mealName: item.meal.name,
        quantity: item.quantity,
        price: item.meal.price,
        status: item.status,
        requestedBy: item.user.name,
        plantName: item.plant?.name || '-',
        requestTime: item.requestTime,
        remarks: item.remarks || '-',
      }));

    case 'records':
      return data.map((item) => ({
        id: item.id,
        ticketId: item.mealRequest.ticketId,
        mealName: item.mealRequest.meal.name,
        quantity: item.mealRequest.quantity,
        requestedBy: item.mealRequest.user.name,
        plantName: item.plant?.name || '-',
        serveTime: item.serveTime,
        consumeTime: item.consumeTime,
        status: item.consumeTime ? 'CONSUMED' : item.serveTime ? 'SERVED' : 'PENDING',
      }));

    default:
      return data;
  }
};

const getHeadersForView = (view) => {
  return TABLE_HEADERS[view] || [];
};

module.exports = {
  TABLE_HEADERS,
  transformData,
  getHeadersForView,
};
