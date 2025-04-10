const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs").promises;
const path = require("path");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

async function scrapeAPI() {
  let allItems = [];
  let currentPage = 1;
  let totalPage = 489;
  const baseUrl =
    "https://vbpl.vn/VBQPPL_UserControls/Publishing_22/TimKiem/p_KetQuaTimKiemVanBan.aspx?SearchIn=VBPQFulltext&DivID=resultSearch&IsVietNamese=True&type=0&s=1&DonVi=13,237&Keyword=%C4%91%E1%BA%A7u%20t%C6%B0&stemp=0&TimTrong1=Title&TimTrong1=Title1&ddrDiaPhuong=237&order=VBPQNgayBanHanh&TypeOfOrder=False&"; // Replace with your actual API endpoint
  const outputFile = "scraped_data.csv";

  // CSV Writer setup
  const csvWriter = createCsvWriter({
    path: outputFile,
    header: [
      { id: "id", title: "id" },
      { id: "title", title: "title" },
      { id: "description", title: "description" },
    ],
    append: true, // Append to existing file instead of overwriting
  });

  // Load existing data if file exists (optional, for checking duplicates)
  try {
    const existingData = await fs.readFile(outputFile, "utf8");
    if (existingData) console.log(`Appending to existing ${outputFile}`);
  } catch (error) {
    if (error.code !== "ENOENT")
      console.error("Error checking existing file:", error);
  }

  try {
    while (currentPage <= totalPage) {
      console.log(`Scraping API page ${currentPage}...`);

      try {
        const response = await axios.get(baseUrl + "Page=" + currentPage, {
          timeout: 30000,
        });

        const $ = cheerio.load(response.data);
        const items = [];

        // Extract items
        $(".item").each((index, element) => {
          // Replace .item-class with your item container selector
          const itemIdMatch = $(element)
            .find("p.title a")
            .attr("href")
            .match(/ItemID=(\d+)/);
          const itemId = itemIdMatch ? itemIdMatch[1] : "";
          const itemData = {
            id: itemId,
            title: $(element).find("p.title a").text().trim() || "",
            description: $(element).find("div.des p").text().trim() || "",
          };
          items.push(itemData);
        });

        // Crawl additional links and download files
        // for (const item of items) {
        //   item.linkedContent = await crawlAdditionalLinks(
        //     item.additionalLinks.split(";")
        //   );
        //   await downloadFiles([item]);
        // }

        // Flatten linkedContent for CSV
        // const csvRecords = items.map((item) => ({
        //   id: item.id,
        //   title: item.title,
        //   description: item.description,
        //   fileUrl: item.fileUrl,
        //   localFilePath: item.localFilePath || "",
        //   additionalLinks: item.additionalLinks,
        //   linkedContent: JSON.stringify(item.linkedContent), // Stringify nested object
        //   downloadError: item.downloadError || "",
        // }));

        // Append to CSV
        await csvWriter.writeRecords(items);
        console.log(
          `Successfully saved page ${currentPage} data to ${outputFile}`
        );

        allItems = [...allItems, ...items]; // Keep in memory for reference

        // Check for next page
        // hasNextPage = $(".next-page").length > 0; // Replace with your next page indicator
        currentPage++;

        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error scraping page ${currentPage}:`, error.message);
        // await csvWriter.writeRecords(
        //   allItems.map((item) => ({
        //     page: item.page,
        //     title: item.title,
        //     description: item.description,
        //     fileUrl: item.fileUrl,
        //     localFilePath: item.localFilePath || "",
        //     additionalLinks: item.additionalLinks,
        //     linkedContent: JSON.stringify(item.linkedContent),
        //     downloadError: item.downloadError || "",
        //   }))
        // );
        if (error.code === "ECONNABORTED") {
          console.log("Network timeout, retrying after delay...");
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } else {
          throw error;
        }
      }
    }

    console.log(`Scraped ${allItems.length} items successfully`);
  } catch (error) {
    console.error("Critical error during scraping:", error);
    // await csvWriter.writeRecords(
    //   allItems.map((item) => ({
    //     page: item.page,
    //     title: item.title,
    //     description: item.description,
    //     fileUrl: item.fileUrl,
    //     localFilePath: item.localFilePath || "",
    //     additionalLinks: item.additionalLinks,
    //     linkedContent: JSON.stringify(item.linkedContent),
    //     downloadError: item.downloadError || "",
    //   }))
    // );
  }
}

async function crawlAdditionalLinks(links) {
  const linkedContent = {};

  for (const link of links) {
    if (link && link.startsWith("http")) {
      try {
        console.log(`Crawling additional link: ${link}`);
        const response = await axios.get(link, { timeout: 30000 });
        const $ = cheerio.load(response.data);

        linkedContent[link] = {
          title: $("title").text().trim() || "",
          text: $("body").text().trim().slice(0, 500),
        };

        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error crawling ${link}:`, error.message);
        linkedContent[link] = { error: error.message };
      }
    }
  }

  return linkedContent;
}

async function downloadFiles(items) {
  const downloadDir = "./downloads";
  await fs.mkdir(downloadDir, { recursive: true });

  for (const item of items) {
    if (item.fileUrl) {
      try {
        const response = await axios.get(item.fileUrl, {
          responseType: "arraybuffer",
          timeout: 30000,
        });

        const fileName = item.fileUrl.split("/").pop() || `file_${Date.now()}`;
        const filePath = path.join(downloadDir, fileName);

        await fs.writeFile(filePath, Buffer.from(response.data));
        item.localFilePath = filePath;
        console.log(`Downloaded: ${fileName}`);
      } catch (error) {
        console.error(`Error downloading ${item.fileUrl}:`, error);
        item.downloadError = error.message;
      }
    }
  }
}

// Run the scraper
scrapeAPI().catch(console.error);
