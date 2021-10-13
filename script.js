// Import dependencies
const cheerio = require("cheerio");
const request = require("request-promise");
const eachDayOfInterval = require("date-fns/eachDayOfInterval");
const format = require("date-fns/format");
const fs = require("fs");
const { convertArrayToCSV } = require("convert-array-to-csv");
const { rangeDates } = require("./options/range");
const { getISOFormat } = require("./utils/utils");

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
const links = changeDashToUnderline.map((d) => `${baseUrl}${d}`);

// Ajax request helper
async function ajaxRequestHandler(url) {
  const response = await request({
    url,
    json: true,
  }).catch((err) => {
    console.log(err);
  });
  return cheerio.load(response);
}

// Request responses from all links
async function getAllLinksResponses(arrayOfLinks) {
  const promises = arrayOfLinks.map(async (singleLink) => {
    try {
      return await ajaxRequestHandler(singleLink);
    } catch (error) {
      return null;
    }
  });

  const responses = await Promise.all(promises);
  const validResponses = responses.filter((r) => r !== null);
  return validResponses;
}

async function extractData(responses) {
  const extractedQuestions = responses.map((res) => {
    const pageArray = res("h2")
      .map((i, el) => ({
        date: res(el)
          .nextUntil("dl")
          .nextUntil("h2")
          .text()
          .match(/[0-9]{2} +[^ ]+ [0-9]{4}/g),
        title: res(el).find(".mw-headline").text(),

        question: res(el)
          .nextUntil("dl")
          .contents()
          .filter(function returnNode() {
            return this.nodeType === 3;
          })
          .text()
          .replace(/\s\s+/g, "")
          .replace("()", ""),

        questionTimeUTC: res(el)
          .nextUntil("h2")
          .text()
          .match(/[0-9]{2}([:])[0-9]{2}/g),

        answer: res(el)
          .nextUntil("dl")
          .next("dl")
          .find("dd")
          .contents()
          .filter(function returnNode() {
            return this.nodeType === 3;
          })
          .text()
          .replace(/\s\s+/g, "")
          .replace("()", ""),

        answerTimeUTC: res(el)
          .nextUntil("dl")
          .nextUntil("h2")
          .text()
          .match(/[0-9]{2}([:])[0-9]{2}/g),
      }))
      .get();
    return pageArray;
  });

  // Flatten array from [[], []] to this []
  const flattenArray = extractedQuestions.flatMap((x) => x);

  // First object of array
  const initialCleanUp = flattenArray.map((o) => ({
    ...o,
    questionTimeUTC: o.questionTimeUTC && o.questionTimeUTC[0],
    answerTimeUTC: o.answerTimeUTC && o.answerTimeUTC[0],
    date: o.date && getISOFormat(o.date[0]),
  }));

  const filterUnwantedObjects = initialCleanUp.filter((e) => e.title !== "");
  // console.log("filterUnwantedObjects", filterUnwantedObjects);
  return filterUnwantedObjects;
}

function removeInfoAboutTheUser(s) {
  // Prepare data for removing user info and data from the text
  const oldString = s
    .replace(/[\n]+/g, " ")
    .replace(/\\/g, " ")
    .replace(/{/g, " ")
    .replace(/}/g, " ");

  // Remove info about the user and date
  const newString = oldString.replace(
    /[0-9]{2}([:])[0-9]{2}(,)( [0-9]+ )([A-Za-z]+ )[0-9]{4} ([(])([UTC]+)([)])/g,
    ""
  );

  return newString;
}
function cleanString(string) {
  //  Custom REGEX for all other issues
  const customRegex = /@|([()])|◄|–|-/g;

  const cleanedString = string
    .replace(/"/g, "'") // Changes all double quotes into single quotes so JSON is valid.
    .replace(customRegex, " ") // Custom reges rules applied.
    .replace(/\s{2,}/g, " ") // Replaces multiple spaces to single one.
    .replace(/\s+\./g, ".") // Replaces spaces before dot if any.
    .trim(); // Trims end and start of the string so there is no whitespace.
  return cleanedString;
}

function cleanData(data) {
  // const customRegex = /@|([()])|◄|–/g;

  const cleanedData = data.map((item) => ({
    // id: cleanString(item.id),
    date: item.date,
    title: cleanString(item.title),
    question: cleanString(removeInfoAboutTheUser(item.question)),
    questionTimeUTC: item.questionTimeUTC,
    answer: cleanString(removeInfoAboutTheUser(item.answer)),
    answerTimeUTC: item.answerTimeUTC,
  }));

  return cleanedData;
}

function createFiles(cleanedData) {
  // Create JSON file from array of objects
  const jsonFromArrayOfObjects = JSON.stringify(cleanedData);
  fs.writeFileSync("data/helpDesk.json", jsonFromArrayOfObjects);

  // Create CSV file from array of objects
  const csvFromArrayOfObjects = convertArrayToCSV(cleanedData);
  fs.writeFileSync("data/helpDesk.csv", csvFromArrayOfObjects);
}

const functionsWrapper = () => {
  getAllLinksResponses(links)
    .then((responses) => extractData(responses))
    .then((res) => cleanData(res))
    .then((data) => createFiles(data));
};

// Main function, where all the functions are being called
async function main() {
  await functionsWrapper(links);
}

main();
