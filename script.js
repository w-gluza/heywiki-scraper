/* eslint-disable no-useless-escape */
// Import dependencies
const cheerio = require("cheerio");
const request = require("request-promise");
const eachDayOfInterval = require("date-fns/eachDayOfInterval");
const format = require("date-fns/format");
const fs = require("fs");
const { convertArrayToCSV } = require("convert-array-to-csv");
const { rangeDates } = require("./options/range");
const { getISOFormat } = require("./utils/utils");

// Base URL and Prefix URL simplified as basePath.
// Entry-specific URL example = /2020_January_1.

const baseURL = "https://en.wikipedia.org";
const prefixURL = "/wiki/Wikipedia:Help_desk/Archives/";

const basePath = `${baseURL}${prefixURL}`;

// Function to create an array of dates
const datesResults = eachDayOfInterval({
  start: rangeDates.startDate,
  end: rangeDates.endDate,
});

// Map date from 2021-01-11T23:00:00.000Z to 2021-January-12.
const mapTooLongDate = datesResults.map((m) => format(m, "yyyy-MMMM-d"));

// Find and replace all "-" with "_"
const changeHyphenToUnderscore = mapTooLongDate.map((i) =>
  i.replace(/-/g, "_")
);

// String Concatenation basePath + changeHyphenToUnderscore.
// 'https://en.wikipedia.org/wiki/Wikipedia:Help_desk/Archives/2021_January_30',
const links = changeHyphenToUnderscore.map((d) => `${basePath}${d}`);

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

// Request responses from all urls/links.
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

// Extracting data from HTML by targeting specific tags and classes.
async function extractData(responses) {
  const extractedQuestions = responses.map((res) => {
    const pageDate = res("h1")
      .text()
      .match(/[0-9]{4} +[^ ]+ [0-9]{1,2}/g);

    const pageArray = res("h2")
      .map((i, el) => ({
        pageDate,
        title: res(el).find(".mw-headline").text(),
        question: res(el)
          .nextUntil("dl")
          .contents()
          .text()
          .replace(/\s\s+/g, "")
          .replace("()", ""),

        questionTimeUTC: res(el)
          .nextUntil("h2")
          .text()
          .match(/[0-9]{2}([:])[0-9]{2}/g),

        answer: res(el).nextUntil("dl").next("dl").find("dd").contents().text(),

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

  // Remove empty objects.
  const initialCleanUp = flattenArray.map((o) => ({
    ...o,
    questionTimeUTC: o.questionTimeUTC && o.questionTimeUTC[0],
    answerTimeUTC: o.answerTimeUTC && o.answerTimeUTC[0],
    pageDate: o.pageDate && getISOFormat(o.pageDate[0]),
  }));
  const filterUnwantedObjects = initialCleanUp.filter((e) => e.title !== "");
  return filterUnwantedObjects;
}

// Remove usernames from the question/answer.
function removeInfoAboutTheUser(s) {
  const oldString = s
    .replace(/[\n]+/g, " ")
    .replace(/\\/g, " ")
    .replace(/{/g, " ")
    .replace(/}/g, " ");

  // Target user/date.
  const newString = oldString.replace(
    /[0-9]{2}([:])[0-9]{2}(,)( [0-9]+ )([A-Za-z]+ )[0-9]{4} ([(])([UTC]+)([)])/g,
    ""
  );

  return newString;
}
function cleanString(string) {
  //  Custom REGEX for symbols that needs to be removed from strings.
  const customRegex = /([()])|◄|—|([[]])/g;

  const cleanedString = string
    .split("Preceding unsigned comment")[0]
    // eslint-disable-next-line prettier/prettier
    .split("\(talk)")[0]
    .replace(/"/g, "'") // Changes all double quotes into single quotes so JSON is properly encoded.
    .replace(customRegex, " ") // Custom reges rules applied.
    .replace(/\s{2,}/g, " ") // Replaces multiple spaces to single one.
    .replace(/\s+\./g, ".") // Replaces spaces before dot if any.
    .replace(/@.+?:/g, " ") // Replace user info @userName: REGEX looks for @ and :
    .trim(); // Trims end and start of the string so there is no whitespace.
  return cleanedString;
}

function trimLastWord(string) {
  const cleanedString = string // Trims end and start of the string so there is no whitespace.
    .split(" ")
    .slice(0, -1)
    .join(" ");
  return cleanedString;
}

function cleanData(data) {
  const cleanedData = data.map((item) => ({
    date: item.pageDate,
    title: cleanString(item.title),
    question: cleanString(removeInfoAboutTheUser(item.question)),
    questionTimeUTC: item.questionTimeUTC,
    answer: trimLastWord(cleanString(removeInfoAboutTheUser(item.answer))),
    answerTimeUTC: item.answerTimeUTC,
  }));

  return cleanedData;
}

function createFiles(cleanedData) {
  // Create JSON file from array of objects.
  const jsonFromArrayOfObjects = JSON.stringify(cleanedData);
  fs.writeFileSync("data/helpDesk.json", jsonFromArrayOfObjects);

  // Create CSV file from array of objects.
  const csvFromArrayOfObjects = convertArrayToCSV(cleanedData);
  fs.writeFileSync("data/helpDesk.csv", csvFromArrayOfObjects);
}

const functionsWrapper = () => {
  getAllLinksResponses(links)
    .then((responses) => extractData(responses))
    .then((res) => cleanData(res))
    .then((data) => createFiles(data));
};

// Main function, where all the functions are being called.
async function main() {
  await functionsWrapper(links);
}

main();
