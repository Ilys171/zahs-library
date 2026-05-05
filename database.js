const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { PDFDocument } = require("pdf-lib");

const db = new Database("library.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_code TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    surname TEXT NOT NULL,
    class_name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    year TEXT,
    language TEXT NOT NULL,
    genre TEXT NOT NULL,
    pages INTEGER NOT NULL,
    access_status TEXT DEFAULT 'safe',
    pdf_path TEXT NOT NULL,
    note TEXT
  );

  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    borrowed_at TEXT NOT NULL,
    due_at TEXT NOT NULL,
    returned_at TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (book_id) REFERENCES books(id)
  );

  CREATE TABLE IF NOT EXISTS feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER,
  name TEXT,
  category TEXT NOT NULL,
  rating INTEGER NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  FOREIGN KEY (student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS book_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER,
  name TEXT,
  title TEXT NOT NULL,
  author TEXT,
  language TEXT,
  reason TEXT,
  created_at TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  FOREIGN KEY (student_id) REFERENCES students(id)
);
`);

async function getPdfPageCount(pdfPath) {
  try {
    const fullPath = path.join(__dirname, "public", pdfPath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`PDF tapılmadı: ${pdfPath}. Səhifə sayı 1 olaraq yazıldı.`);
      return 1;
    }

    const pdfBytes = fs.readFileSync(fullPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    return pdfDoc.getPageCount();
  } catch (error) {
    console.warn(`PDF oxunmadı: ${pdfPath}. Səhifə sayı 1 olaraq yazıldı.`);
    return 1;
  }
}

function seedStudents() {
  const studentCount = db
    .prepare("SELECT COUNT(*) AS count FROM students")
    .get().count;

  if (studentCount > 0) {
    return;
  }

  const studentsPath = path.join(__dirname, "students.json");

  if (!fs.existsSync(studentsPath)) {
    console.warn("students.json tapılmadı. Şagirdlər əlavə edilmədi.");
    return;
  }

  const students = JSON.parse(fs.readFileSync(studentsPath, "utf-8"));

  const insertStudent = db.prepare(`
    INSERT INTO students (student_code, password, name, surname, class_name)
    VALUES (?, ?, ?, ?, ?)
  `);

  students.forEach((student) => {
    insertStudent.run(
      student.student_code,
      student.password,
      student.name,
      student.surname,
      student.class_name,
    );
  });

  console.log(`${students.length} şagird bazaya əlavə edildi.`);
}

async function seedBooks() {
  const booksPath = path.join(__dirname, "books-data.json");

  if (!fs.existsSync(booksPath)) {
    console.warn("books-data.json tapılmadı. Kitablar əlavə edilmədi.");
    return;
  }

  const books = JSON.parse(fs.readFileSync(booksPath, "utf-8"));

  const findBook = db.prepare(`
    SELECT id FROM books
    WHERE title = ? AND author = ?
  `);

  const insertBook = db.prepare(`
    INSERT INTO books (
      title, author, year, language, genre, pages, access_status, pdf_path, note
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateBook = db.prepare(`
    UPDATE books
    SET
      year = ?,
      language = ?,
      genre = ?,
      pages = ?,
      access_status = ?,
      pdf_path = ?,
      note = ?
    WHERE id = ?
  `);

  let inserted = 0;
  let updated = 0;

  for (const book of books) {
    const pageCount = book.pages
      ? Number(book.pages)
      : await getPdfPageCount(book.pdf_path);

    const existingBook = findBook.get(book.title, book.author);

    if (existingBook) {
      updateBook.run(
        book.year || "",
        book.language,
        book.genre,
        pageCount,
        book.access_status || "safe",
        book.pdf_path,
        book.note || "",
        existingBook.id,
      );

      updated++;
    } else {
      insertBook.run(
        book.title,
        book.author,
        book.year || "",
        book.language,
        book.genre,
        pageCount,
        book.access_status || "safe",
        book.pdf_path,
        book.note || "",
      );

      inserted++;
    }
  }

  console.log(`${inserted} kitab əlavə edildi, ${updated} kitab yeniləndi.`);
}

async function initDatabase() {
  seedStudents();
  await seedBooks();
}

initDatabase().catch((error) => {
  console.error("Database initialization error:", error);
});

module.exports = db;
