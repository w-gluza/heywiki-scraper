const fs = require("fs");

function appendJSON(path, array) {
  return fs.appendFile(
    path,
    JSON.stringify(array)
      .replace(/[\n]+/g, " ")
      .replace(/\\/g, "")
      .replace(/[(]()[)]/g, ""),
    (err) => {
      if (err) console.log(err);
    }
  );
}

module.exports = {
  appendJSON,
};
