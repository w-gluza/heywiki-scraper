// Import dependencies
const cheerio = require("cheerio");
const request = require("request-promise");
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
const links = changeDashToUnderline.map((d) => `${baseUrl}${d}`);

// Ajax request helper
async function ajaxRequestHandler(url) {
  if (url) {
    const response = await request({
      url,
      json: true,
    }).catch((err) => {
      console.log(err);
    });
    return cheerio.load(response);
  }
  return {};
}

// Request responses from all links
async function getAllLinksResponses(arrayOfLinks) {
  const promises = [];
  const handleRequest = (l) => ajaxRequestHandler(l);

  arrayOfLinks.map((singleLink) => ({
    singleLink: promises.push(handleRequest(singleLink)),
  }));
  const responses = await Promise.all(promises);
  return responses;
}

async function extractData(responses) {
  const extractedQuestions = responses.map((res) => {
    const questionObject = res("h2")
      .map((i, el) => ({
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

        // questionTimeUTC: res(el)
        //   .nextUntil("h2")
        //   .text()
        //   .match(/[0-9]{2}([:])[0-9]{2}/g),

        // answerTimeUTC: res(el)
        //   .nextUntil("dl")
        //   .nextUntil("h2")
        //   .text()
        //   .match(/[0-9]{2}([:])[0-9]{2}/g),
      }))
      .get();
    return questionObject;
  });
  console.log("extractedQuestions", extractedQuestions);
  return extractedQuestions;
}

// Be kind and do not send too many request to server
function delay(n) {
  return new Promise((done) => {
    setTimeout(() => {
      done();
    }, n);
  });
}

const functionsWrapper = () => {
  getAllLinksResponses(links).then((responses) => {
    extractData(responses);
  });
};

// main function, this is where all functions are called
async function main() {
  // console.log("Getting all raw rsponses from help desk");
  // await getAllLinksResponses(links);
  await functionsWrapper(links);
  // console.log("Sleeping for 4 seconds");
  await delay(4000);
}

main();
