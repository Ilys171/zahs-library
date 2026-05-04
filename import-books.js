const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const importListPath = path.join(__dirname, "book-import-list.json");
const booksDataPath = path.join(__dirname, "books-data.json");
const booksFolder = path.join(__dirname, "public", "books");

if (!fs.existsSync(importListPath)) {
  console.error("book-import-list.json tapılmadı.");
  process.exit(1);
}

if (!fs.existsSync(booksFolder)) {
  fs.mkdirSync(booksFolder, { recursive: true });
}

const importList = JSON.parse(fs.readFileSync(importListPath, "utf-8"));

let existingBooks = [];

if (fs.existsSync(booksDataPath)) {
  existingBooks = JSON.parse(fs.readFileSync(booksDataPath, "utf-8"));
}

function normalizeBook(book) {
  return {
    title: book.title,
    author: book.author,
    year: book.year,
    language: book.language,
    genre: book.genre,
    pages: book.pages,
    access_status: book.access_status || "safe",
    pdf_path: `books/${book.pdfFile}`,
    note: book.note || "",
  };
}

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    if (!url) {
      resolve(false);
      return;
    }

    const client = url.startsWith("https") ? https : http;

    const file = fs.createWriteStream(destination);

    client
      .get(url, (response) => {
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          file.close();
          fs.unlinkSync(destination);
          downloadFile(response.headers.location, destination)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destination);
          reject(new Error(`Download failed: ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          resolve(true);
        });
      })
      .on("error", (error) => {
        file.close();

        if (fs.existsSync(destination)) {
          fs.unlinkSync(destination);
        }

        reject(error);
      });
  });
}

async function main() {
  const missingPdfs = [];
  let added = 0;
  let updated = 0;
  let downloaded = 0;

  for (const item of importList) {
    const normalizedBook = normalizeBook(item);

    const index = existingBooks.findIndex(
      (book) =>
        book.title === normalizedBook.title &&
        book.author === normalizedBook.author,
    );

    if (index >= 0) {
      existingBooks[index] = normalizedBook;
      updated++;
    } else {
      existingBooks.push(normalizedBook);
      added++;
    }

    const pdfPath = path.join(booksFolder, item.pdfFile);

    if (!fs.existsSync(pdfPath)) {
      if (item.downloadUrl) {
        console.log(`Downloading: ${item.title}`);
        await downloadFile(item.downloadUrl, pdfPath);
        downloaded++;
      } else {
        missingPdfs.push(item.pdfFile);
      }
    }
  }

  fs.writeFileSync(
    booksDataPath,
    JSON.stringify(existingBooks, null, 2),
    "utf-8",
  );

  console.log("Import finished.");
  console.log(`${added} books added.`);
  console.log(`${updated} books updated.`);
  console.log(`${downloaded} PDFs downloaded.`);

  if (missingPdfs.length > 0) {
    console.log("\nMissing PDF files:");
    missingPdfs.forEach((file) => {
      console.log(`- public/books/${file}`);
    });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
