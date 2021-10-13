const parseISO = require("date-fns/parseISO");

// Range for data scraping
const rangeDates = {
  startDate: parseISO("2020-01-04"),
  endDate: parseISO("2020-01-12"),
};

module.exports = {
  rangeDates,
};
