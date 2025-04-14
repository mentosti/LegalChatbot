const axios = require("axios");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const cheerio = require("cheerio");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Example: generate url based on id
const generateUrl = (id) =>
  `https://vbpl.vn/tw/Pages/vbpq-thuoctinh.aspx?dvid=13&ItemID=${id}`;

const downloadPage = async (url, retry = 1) => {
  try {
    console.log(`Fetching ${url}...`);
    const response = await axios.get(url);
    const html = response.data;

    const $ = cheerio.load(html);

    if (!$("#menu").length) {
      console.log(`Page missing required content. Attempt: ${retry}`);
      if (retry >= 100) {
        console.error("Retry limit reached. Skip page.");
        return null;
      }
      console.log("Waiting 5 minutes before retrying...");
      await sleep(5 * 60 * 1000);
      return downloadPage(url, retry + 1);
    }

    return html;
  } catch (err) {
    console.log(`Failed to fetch ${url} | Attempt: ${retry}`);
    if (retry >= 100) {
      console.error("Retry limit reached.");
      return null;
    }
    console.log("Waiting 5 minutes before retrying...");
    await sleep(5 * 60 * 1000);
    return downloadPage(url, retry + 1);
  }
};

const processPage = async (id) => {
  const url = generateUrl(id);
  const htmlPath = path.join(__dirname, "data/html", `${id}.html`);

  if (fs.existsSync(htmlPath)) {
    console.log(`Already exists: ${htmlPath}`);
    return;
  }

  const html = await downloadPage(url);
  if (!html) {
    console.error(`Skipping ${url}`);
    return;
  }

  fs.writeFileSync(htmlPath, html, "utf8");
  console.log(`Saved HTML to: ${htmlPath}`);
};

const start = async () => {
  const rows = [];

  fs.createReadStream("scraped_data.csv")
    .pipe(csv())
    .on("data", (row) => rows.push(row))
    .on("end", async () => {
      for (const item of rows) {
        console.log(`Processing: ${item.id} | ${item.title}`);
        await processPage(item.id);
        console.log("---");
      }
    });
};

start();
