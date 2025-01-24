const moment = require('moment-timezone');

const timeUtils = {
  getCurrentTime: () => {
    return moment().tz('Asia/Kolkata');
  },

  formatToIST: (date) => {
    if (!date) return null;
    return moment(date).tz('Asia/Kolkata');
  },

  formatTimeOnly: (date) => {
    if (!date) return null;
    return moment(date).tz('Asia/Kolkata').format('HH:mm:ss');
  },

  formatDateOnly: (date) => {
    if (!date) return null;
    return moment(date).tz('Asia/Kolkata').format('YYYY-MM-DD');
  },

  formatDateTime: (date) => {
    if (!date) return null;
    return moment(date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
  },

  // For database queries
  getStartOfDay: (date) => {
    return moment(date).tz('Asia/Kolkata').startOf('day').toDate();
  },

  getEndOfDay: (date) => {
    return moment(date).tz('Asia/Kolkata').endOf('day').toDate();
  }
};

module.exports = timeUtils; 