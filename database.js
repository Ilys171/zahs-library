const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

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
`);

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

function seedBooks() {
  const bookCount = db
    .prepare("SELECT COUNT(*) AS count FROM books")
    .get().count;

  if (bookCount > 0) {
    return;
  }

  const insertBook = db.prepare(`
    INSERT INTO books (
      title, author, year, language, genre, pages, access_status, pdf_path, note
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBook.run(
    "Poçt qutusu",
    "Cəlil Məmmədquluzadə",
    "1903",
    "AZ",
    "Qısa əsərlər",
    20,
    "safe",
    "books/poct-qutusu.pdf",
    "Qısa və məktəb üçün rahat klassik əsər.",
  );

  insertBook.run(
    "Şineli",
    "Nikolay Qoqol",
    "1842",
    "RU",
    "Qısa əsərlər",
    55,
    "safe",
    "books/shinel.pdf",
    "Çox güclü qısa rus klassikası.",
  );

  insertBook.run(
    "Revizor",
    "Nikolay Qoqol",
    "1836",
    "RU",
    "Rus ədəbiyyatı",
    120,
    "safe",
    "books/revizor.pdf",
    "Satira və teatr bölməsi üçün uyğundur.",
  );

  insertBook.run(
    "Mumu",
    "İvan Turgenev",
    "1854",
    "RU",
    "Qısa əsərlər",
    60,
    "safe",
    "books/mumu.pdf",
    "Qısa və emosional klassik əsər.",
  );

  insertBook.run(
    "Ölülər",
    "Cəlil Məmmədquluzadə",
    "1909",
    "AZ",
    "Azərbaycan ədəbiyyatı",
    100,
    "safe",
    "books/oluler.pdf",
    "Müzakirə və analiz üçün güclü əsər.",
  );

  console.log("Başlanğıc kitablar bazaya əlavə edildi.");
}

seedStudents();
seedBooks();

module.exports = db;
