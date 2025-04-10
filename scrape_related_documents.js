const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs").promises;
const csvParse = require("csv-parse");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// Define the 17 categories (replace with actual category names or IDs from the site)
const categories = Array.from({ length: 18 }, (_, i) => `cat${i + 1}`);

async function crawlPage(id) {
  const url = `https://vbpl.vn/TW/pages/vbpq-luocdo.aspx?ItemID=${id}&Keyword=%C4%91%E1%BA%A7u%20t%C6%B0`; // Replace with actual URL pattern
  try {
    const response = await axios.get(url, { timeout: 30000 });
    const $ = cheerio.load(response.data);

    // Object to store item IDs by category
    const categoryIds = categories.reduce((acc, cat) => {
      acc[cat] = [];
      return acc;
    }, {});

    // Extract items from the page (customize selector and attributes)
    $(".luocdo").each((i, element) => {
      const category = `cat${i + 1}`;
      const itemIds = $(element)
        .find(".content > ul > li > a")
        .map((i, li) => {
          const id = $(li)
            .attr("href")
            .match(/ItemID=(\d+)/);
          return id ? id[1] : "";
        })
        .get()
        .filter((id) => id);
      if (category && itemIds && categories.includes(category)) {
        categoryIds[category].push(itemIds);
      }
    });

    return categoryIds;
  } catch (error) {
    console.error(`Error crawling page for ID ${id}:`, error.message);
    return categories.reduce((acc, cat) => {
      acc[cat] = [];
      return acc;
    }, {});
  }
}

async function processCSV() {
  const inputFile = "scraped_data.csv"; // Input CSV file
  const outputFile = "scraped_data_with_relatedIDs.csv"; // Output CSV file

  // Define CSV headers for output (id, title, description + 17 category columns)
  const csvHeaders = [
    { id: "id", title: "id" },
    { id: "title", title: "title" },
    { id: "description", title: "description" },
    ...categories.map((cat) => ({ id: `${cat}IDs`, title: `${cat}IDs` })),
  ];

  // CSV Writer
  const csvWriter = createCsvWriter({
    path: outputFile,
    header: csvHeaders,
  });

  // Read input CSV
  const fileContent = await fs.readFile(inputFile, "utf8");
  const records = [];

  const parser = csvParse.parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  for await (const record of parser) {
    records.push(record);
  }

  // Load existing output records (if any) to avoid duplicates
  let existingRecords = [];
  try {
    const existingContent = await fs.readFile(outputFile, "utf8");
    const existingParser = csvParse.parse(existingContent, {
      columns: true,
      skip_empty_lines: true,
    });
    for await (const record of existingParser) {
      existingRecords.push(record);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Error loading existing output:", error);
    }
  }

  // Process each record and save incrementally
  const processedIds = new Set(existingRecords.map((r) => r.id)); // Track processed IDs
  const outputRecords = [...existingRecords]; // Start with existing records

  for (const record of records) {
    const { id, title, description } = record;

    // Skip if already processed
    if (processedIds.has(id)) {
      console.log(`Skipping already processed ID: ${id}`);
      continue;
    }

    console.log(`Crawling page for ID: ${id}`);

    // Crawl page and get category IDs
    const categoryIds = await crawlPage(id);

    // Prepare output record
    const outputRecord = {
      id,
      title,
      description,
      ...categories.reduce((acc, cat) => {
        acc[`${cat}IDs`] = categoryIds[cat].join(","); // Join IDs with semicolon
        return acc;
      }, {}),
    };

    outputRecords.push(outputRecord);
    processedIds.add(id);
    await csvWriter.writeRecords([outputRecord]);
    console.log(`Successfully saved data for ID ${id} to ${outputFile}`);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay to avoid rate limiting
  }

  console.log(
    `Processed ${outputRecords.length} records. Output saved to ${outputFile}`
  );
}

// Run the script
processCSV().catch((error) => console.error("Error:", error));
