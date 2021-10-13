const parseISO = require("date-fns/parseISO");

// Range for data scraping
const rangeDates = {
  startDate: parseISO("2020-01-20"),
  endDate: parseISO("2020-02-05"),
};

module.exports = {
  rangeDates,
};
