const parseISO = require("date-fns/parseISO");

// Range for data scraping
const rangeDates = {
  startDate: parseISO("2021-10-01"),
  endDate: parseISO("2021-10-01"),
};

module.exports = {
  rangeDates,
};
