// Import dependencies
const eachDayOfInterval = require("date-fns/eachDayOfInterval");
const format = require("date-fns/format");
const { rangeDates } = require("./options/range");

// Base url
const baseUrl = "https://en.wikipedia.org/wiki/Wikipedia:Help_desk/Archives/";

// Function to create a text file containing all links to questions

const result = eachDayOfInterval({
  start: rangeDates.startDate,
  end: rangeDates.endDate,
});

// Map date from 2021-01-11T23:00:00.000Z to 2021-January-12
const mapTooLongDate = result.map((m) => format(m, "yyyy-MMMM-d"));

// Find and replace all "-" to "_"
const changeDashToUnderline = mapTooLongDate.map((i) => i.replace(/-/g, "_"));

// Create link to Wikipedia eg.
// 'https://en.wikipedia.org/wiki/Wikipedia:Help_desk/Archives/2021_January_30',
const arrayOfWikipediaLinks = changeDashToUnderline.map(
  (d) => `${baseUrl}${d}`
);

console.log("arrayOfWikipediaLinks", arrayOfWikipediaLinks);
