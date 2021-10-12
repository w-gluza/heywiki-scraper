const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// get month by number
function getMonth(month) {
  switch (month) {
    case "January":
      return "01";
    case "February":
      return "02";
    case "March":
      return "03";
    case "April":
      return "04";
    case "May":
      return "05";
    case "June":
      return "06";
    case "July":
      return "07";
    case "August":
      return "08";
    case "September":
      return "09";
    case "October":
      return "10";
    case "November":
      return "11";
    case "December":
      return "12";
    default:
      return false;
  }
}

function getISOFormat(date) {
  const split = date.split(" ");
  const numericalMonth = getMonth(split[1]);
  const formattedDate = `${split[2]}-${numericalMonth}-${split[0]}`;
  return formattedDate;
}

module.exports = {
  months,
  getISOFormat,
};
