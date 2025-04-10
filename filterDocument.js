const fs = require("fs").promises;
const csv = require("csv-parse");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// Mảng các tỉnh thành Việt Nam
const vietnamProvinces = [
  "An Giang",
  "Bà Rịa - Vũng Tàu",
  "Bắc Giang",
  "Bắc Kạn",
  "Bạc Liêu",
  "Bắc Ninh",
  "Bến Tre",
  "Bình Định",
  "Bình Dương",
  "Bình Phước",
  "Bình Thuận",
  "Cà Mau",
  "Cần Thơ",
  "Cao Bằng",
  "Đà Nẵng",
  "Đắk Lắk",
  "Đắk Nông",
  "Điện Biên",
  "Đồng Nai",
  "Đồng Tháp",
  "Gia Lai",
  "Hà Giang",
  "Hà Nam",
  "Hà Nội",
  "Hà Tĩnh",
  "Hải Dương",
  "Hải Phòng",
  "Hậu Giang",
  "Hòa Bình",
  "Hưng Yên",
  "Khánh Hòa",
  "Kiên Giang",
  "Kon Tum",
  "Lai Châu",
  "Lâm Đồng",
  "Lạng Sơn",
  "Lào Cai",
  "Long An",
  "Nam Định",
  "Nghệ An",
  "Ninh Bình",
  "Ninh Thuận",
  "Phú Thọ",
  "Phú Yên",
  "Quảng Bình",
  "Quảng Nam",
  "Quảng Ngãi",
  "Quảng Ninh",
  "Quảng Trị",
  "Sóc Trăng",
  "Sơn La",
  "Tây Ninh",
  "Thái Bình",
  "Thái Nguyên",
  "Thanh Hóa",
  "Thừa Thiên Huế",
  "Tiền Giang",
  "Trà Vinh",
  "Tuyên Quang",
  "Vĩnh Long",
  "Vĩnh Phúc",
  "Yên Bái",
  "Hồ Chí Minh",
  "Tây Nguyên",
  "Trung Bộ",
];

// Hàm kiểm tra và trả về tỉnh thành khác ngoài "Bình Dương"
function checkProvinceInDescription(description) {
  const provinceRegex = new RegExp(
    `\\b(${vietnamProvinces.join("|")})\\b`,
    "i"
  );
  const match = description.match(provinceRegex);

  if (match) {
    const foundProvince = match[1];
    return foundProvince.toLowerCase() !== "bình dương" ? foundProvince : null;
  }
  return null; // Không có tỉnh nào hoặc chỉ có "Bình Dương"
}

async function filterCSV() {
  const inputFile = "filtered_data.csv"; // File CSV đầu vào
  const outputFile = "filtered_data2.csv"; // File CSV đầu ra

  // Đọc file CSV
  const fileContent = await fs.readFile(inputFile, "utf8");
  const records = [];

  // Parse CSV
  const parser = csv.parse(fileContent, {
    columns: true, // Tự động parse header
    skip_empty_lines: true,
  });

  for await (const record of parser) {
    records.push(record);
  }

  // Lọc dữ liệu
  const filteredRecords = records.filter((record) => {
    const province = checkProvinceInDescription(record.description);
    // Giữ lại nếu không có tỉnh nào (province === null) hoặc chỉ có "Bình Dương"
    return province === null;
  });

  // Tạo CSV writer
  const csvWriter = createCsvWriter({
    path: outputFile,
    header: [
      { id: "id", title: "id" },
      { id: "title", title: "title" },
      { id: "description", title: "description" },
    ],
  });

  // Ghi dữ liệu đã lọc vào file CSV mới
  await csvWriter.writeRecords(filteredRecords);
  console.log(
    `Filtered data saved to ${outputFile}. Total records: ${filteredRecords.length}`
  );
}

// Chạy chương trình
filterCSV().catch((error) => console.error("Error:", error));
