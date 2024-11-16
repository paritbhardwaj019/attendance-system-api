class ApiResponse {
  constructor(statusCode, message, data = null) {
    this.statusCode = statusCode;
    this.status = 'success';
    this.message = message;
    if (data) this.data = data;

    this.timestamp = new Date().toISOString();
  }

  static success(statusCode, message, data) {
    return new ApiResponse(statusCode, message, data);
  }

  static error(statusCode, message) {
    return new ApiResponse(statusCode, message);
  }
}

module.exports = ApiResponse;
