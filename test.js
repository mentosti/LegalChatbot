const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const content = fs.readFileSync(
  path.join(__dirname, "data/html-thuoctinh", "6.html")
);
const $ = cheerio.load(content);
const scope = $(".vbProperties > table tr:nth-child(6) td");
// console.log($(scope[1]).text().trim());
console.log(getInnerText($(scope[1])));
function getInnerText($element) {
  const
}
