const Database = require("better-sqlite3");

const db = new Database("library.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
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

const studentCount = db
  .prepare("SELECT COUNT(*) AS count FROM students")
  .get().count;

if (studentCount === 0) {
  const insertStudent = db.prepare(`
    INSERT INTO students (student_code, name, class_name)
    VALUES (?, ?, ?)
  `);

  insertStudent.run("4837", "Demo Student", "10A");
  insertStudent.run("1234", "Test Student", "9B");
}

const bookCount = db.prepare("SELECT COUNT(*) AS count FROM books").get().count;

if (bookCount === 0) {
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
    "Шинель",
    "Николай Гоголь",
    "1842",
    "RU",
    "Qısa əsərlər",
    55,
    "safe",
    "books/shinel.pdf",
    "Çox güclü qısa rus klassikası.",
  );

  insertBook.run(
    "Ревизор",
    "Николай Гоголь",
    "1836",
    "RU",
    "Rus ədəbiyyatı",
    120,
    "safe",
    "books/revizor.pdf",
    "Satira və teatr bölməsi üçün uyğundur.",
  );
}

module.exports = db;
