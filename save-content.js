const axios = require("axios");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const csvParser = require("csv-parse");
const cheerio = require("cheerio");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Example: generate url based on id
const generateUrl = (id) =>
  `https://vbpl.vn/tw/Pages/vbpq-toanvan.aspx?dvid=13&ItemID=${id}`;

const downloadPage = async (url, retry = 1) => {
  try {
    console.log(`Fetching ${url}...`);
    const response = await axios.get(url);
    const html = response.data;

    const $ = cheerio.load(html);
    // const htmlPath = path.join(__dirname, "data/html-toanvan", `hello.html`);
    // fs.writeFileSync(htmlPath, html, "utf8");
    if ($("a.selected b.source").length) {
      return null;
    }

    if (!$(".toanvancontent").length) {
      console.log(`Page missing required content. Attempt: ${retry}`);
      if (retry >= 5) {
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
    if (retry >= 5) {
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
  const htmlPath = path.join(__dirname, "data/html-toanvan", `${id}.html`);
  const pdfPath = path.join(__dirname, "data/html-toanvan", `${id}.pdf`);
  const failedPath = path.join(__dirname, "data", "failed.csv");
  if (fs.existsSync(htmlPath) || fs.existsSync(pdfPath)) {
    console.log(`Already exists: ${htmlPath}`);
    return;
  }

  const html = await downloadPage(url);
  if (!html) {
    console.error(`Skipping ${url}`);

    // Append to failed.csv
    const line = `${id}\n`;
    fs.appendFileSync(failedPath, line, "utf8");

    return;
  }

  fs.writeFileSync(htmlPath, html, "utf8");
  console.log(`Saved HTML to: ${htmlPath}`);
};
const failedIds = new Set();

async function loadFailedIds() {
  const failedPath = path.join(__dirname, "data", "failed.csv");

  try {
    const content = fs.readFileSync(failedPath, { encoding: "utf-8" });
    const parser = csvParser.parse(content, {
      columns: true,
      skip_empty_lines: true,
    });

    for await (const record of parser) {
      failedIds.add(record.id);
    }

    console.log(`Loaded ${failedIds.size} failed IDs from ${failedPath}`);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(`No failed.csv found. Continue...`);
    } else {
      console.error("Error reading failed.csv:", error);
    }
  }
}

const start = async () => {
  const rows = [];
  await loadFailedIds();

  fs.createReadStream("scraped_data.csv")
    .pipe(csv())
    .on("data", (row) => rows.push(row))
    .on("end", async () => {
      for (const item of rows) {
        if (!failedIds.has(item.id)) {
          console.log(`Processing: ${item.id} | ${item.title}`);
          await processPage(item.id);
          console.log("---");
        } else {
          console.log(`${item.id} is already failed`);
        }
      }
    });
};

start();
