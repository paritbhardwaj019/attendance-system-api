const TABLE_HEADERS = {
  requests: [
    { field: 'ticketId', headerName: 'Ticket ID', width: '150', sortable: true },
    { field: 'mealName', headerName: 'Meal', width: '200', sortable: true },
    { field: 'quantity', headerName: 'Quantity', width: '100', sortable: true },
    { field: 'price', headerName: 'Price', width: '100', sortable: true },
    { field: 'status', headerName: 'Status', width: '120', sortable: true },
    { field: 'requestedBy', headerName: 'Requested By', width: '150', sortable: true },
    { field: 'plantName', headerName: 'Plant', width: '150', sortable: true },
    { field: 'requestTime', headerName: 'Request Time', width: '180', sortable: true },
    { field: 'remarks', headerName: 'Remarks', width: '200', sortable: true },
  ],

  records: [
    { field: 'ticketId', headerName: 'Ticket ID', width: '150', sortable: true },
    { field: 'mealName', headerName: 'Meal', width: '200', sortable: true },
    { field: 'quantity', headerName: 'Quantity', width: '100', sortable: true },
    { field: 'requestedBy', headerName: 'Requested By', width: '150', sortable: true },
    { field: 'plantName', headerName: 'Plant', width: '150', sortable: true },
    { field: 'serveTime', headerName: 'Serve Time', width: '180', sortable: true },
    { field: 'consumeTime', headerName: 'Consume Time', width: '180', sortable: true },
    { field: 'status', headerName: 'Status', width: '120', sortable: true },
  ],

  meals: [
    { field: 'id', headerName: 'ID', width: '80', sortable: true },
    { field: 'name', headerName: 'Meal Name', width: '200', sortable: true },
    { field: 'price', headerName: 'Price', width: '120', sortable: true },
    { field: 'createdAt', headerName: 'Created At', width: '180', sortable: true },
    { field: 'updatedAt', headerName: 'Updated At', width: '180', sortable: true },
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

    case 'meals':
      return data.map((meal) => ({
        id: meal.id,
        name: meal.name,
        price: meal.price,
        createdAt: meal.createdAt,
        updatedAt: meal.updatedAt,
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
