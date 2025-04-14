const path = require("path");
const cheerio = require("cheerio");
const fs = require("fs").promises;
const csvParse = require("csv-parse");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// Define the 17 categories (replace with actual category names or IDs from the site)
const categories = Array.from({ length: 18 }, (_, i) => `cat${i + 1}`);

async function crawlPage(id) {
  const htmlPath = path.join(__dirname, "data/html-thuoctinh", `${id}.html`);
  try {
    // Load local html file
    const html = await fs.readFile(htmlPath, "utf8");
    const $ = cheerio.load(html);

    // Extract items from the page (customize selector and attributes)
    const totalRows = $(".vbProperties > table tr").length;

    const firstRow = $(".vbProperties > table tr:nth-child(2) td");
    const refNumber = $(firstRow[1]).text().trim();
    const issuedDate = $(firstRow[3]).text().trim();

    const secondRow = $(".vbProperties > table tr:nth-child(3) td");
    const docType = $(secondRow[1]).text().trim();
    const effectiveDate = $(secondRow[3]).text().trim();

    const thirdRow = $(".vbProperties > table tr:nth-child(4) td");
    const collectionSource = $(thirdRow[1]).text().trim();
    const gazetteDate = $(thirdRow[3]).text().trim();

    const fourthRow = $(".vbProperties > table tr:nth-child(5) td");
    const fifthRow = $(".vbProperties > table tr:nth-child(6) td");
    const sixthRow = $(".vbProperties > table tr:nth-child(7) td");
    let deparment = "",
      domain = "",
      issuingAuthority = "",
      president = "";

    if (totalRows == 9) {
      deparment = $(fourthRow[1]).text().trim();
      domain = $(fourthRow[3]).text().trim();
      issuingAuthority = $(fifthRow[1]).text().trim();
      president = `${$(fifthRow[2]).text().trim()} ${$(fifthRow[3])
        .text()
        .trim()}`;
    } else if (totalRows == 8) {
      issuingAuthority = $(fourthRow[1]).text().trim();
      president = `${$(fourthRow[2]).text().trim()} ${$(fourthRow[3])
        .text()
        .trim()}`;
      scope = fifthRow[1].text().trim();
    } else {
      console.log(id);
    }

    console.log(issuingAuthority);

    const scope = fifthRow[1].innerText.trim();
    const status = $(".vbProperties > table tr:last-child td").text().trim();

    console.log(scope);
    return {
      id,
      refNumber,
      issuedDate,
      docType,
      effectiveDate,
      collectionSource,
      gazetteDate,
      deparment,
      domain,
      issuingAuthority,
      president,
      scope,
      status,
    };
  } catch (error) {
    console.error(`Error crawling page for ID ${id}:`, error.message);
    return { id };
  }
}

async function processCSV() {
  const inputFile = "scraped_data.csv"; // Input CSV file
  const outputFile = "scraped_data_with_properties.csv"; // Output CSV file

  // Define CSV headers for output (id, title, description + 17 category columns)
  const csvHeaders = [
    { id: "id", title: "id" },
    { id: "refNumber", title: "refNumber" },
    { id: "issuedDate", title: "issuedDate" },
    { id: "effectiveDate", title: "effectiveDate" },
    { id: "docType", title: "docType" },
    { id: "collectionSource", title: "collectionSource" },
    { id: "deparment", title: "deparment" },
    { id: "domain", title: "domain" },
    { id: "gazetteDate", title: "gazetteDate" },
    { id: "issuingAuthority", title: "issuingAuthority" },
    { id: "president", title: "president" },
    { id: "scope", title: "scope" },
    { id: "status", title: "status" },
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
      ...categoryIds,
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
