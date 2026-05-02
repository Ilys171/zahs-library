const express = require("express");
const path = require("path");
const db = require("./database");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function getLoanDays(pages) {
  if (pages <= 60) return 3;
  if (pages <= 180) return 7;
  if (pages <= 450) return 14;
  return 21;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

app.post("/api/login", (req, res) => {
  const { studentCode } = req.body;

  if (!studentCode || !/^\d{4}$/.test(studentCode)) {
    return res.status(400).json({ error: "4 rəqəmli şagird kodu lazımdır." });
  }

  const student = db
    .prepare("SELECT * FROM students WHERE student_code = ?")
    .get(studentCode);

  if (!student) {
    return res.status(404).json({ error: "Şagird tapılmadı." });
  }

  res.json({
    student: {
      id: student.id,
      studentCode: student.student_code,
      name: student.name,
      className: student.class_name,
    },
  });
});

app.get("/api/books", (req, res) => {
  const books = db.prepare("SELECT * FROM books ORDER BY title ASC").all();

  const formattedBooks = books.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    year: book.year,
    language: book.language,
    genre: book.genre,
    pages: book.pages,
    access: book.access_status,
    pdfUrl: book.pdf_path,
    note: book.note,
    loanDays: getLoanDays(book.pages),
  }));

  res.json(formattedBooks);
});

app.get("/api/students/:studentId/loans", (req, res) => {
  const studentId = Number(req.params.studentId);

  const loans = db
    .prepare(
      `
    SELECT
      loans.id AS loan_id,
      loans.borrowed_at,
      loans.due_at,
      loans.returned_at,
      books.*
    FROM loans
    JOIN books ON loans.book_id = books.id
    WHERE loans.student_id = ?
      AND loans.returned_at IS NULL
      AND datetime(loans.due_at) > datetime('now')
  `,
    )
    .all(studentId);

  res.json(loans);
});

app.post("/api/borrow", (req, res) => {
  const { studentId, bookId } = req.body;

  if (!studentId || !bookId) {
    return res.status(400).json({ error: "studentId və bookId lazımdır." });
  }

  const book = db.prepare("SELECT * FROM books WHERE id = ?").get(bookId);

  if (!book) {
    return res.status(404).json({ error: "Əsər tapılmadı." });
  }

  const existingLoan = db
    .prepare(
      `
    SELECT * FROM loans
    WHERE student_id = ?
      AND book_id = ?
      AND returned_at IS NULL
      AND datetime(due_at) > datetime('now')
  `,
    )
    .get(studentId, bookId);

  if (existingLoan) {
    return res.status(409).json({ error: "Bu əsər artıq sənin rəfindədir." });
  }

  const now = new Date();
  const loanDays = getLoanDays(book.pages);
  const due = addDays(now, loanDays);

  const result = db
    .prepare(
      `
    INSERT INTO loans (student_id, book_id, borrowed_at, due_at)
    VALUES (?, ?, ?, ?)
  `,
    )
    .run(studentId, bookId, now.toISOString(), due.toISOString());

  res.json({
    loanId: result.lastInsertRowid,
    borrowedAt: now.toISOString(),
    dueAt: due.toISOString(),
    loanDays,
  });
});

app.post("/api/return", (req, res) => {
  const { studentId, bookId } = req.body;

  if (!studentId || !bookId) {
    return res.status(400).json({ error: "studentId və bookId lazımdır." });
  }

  const result = db
    .prepare(
      `
    UPDATE loans
    SET returned_at = ?
    WHERE student_id = ?
      AND book_id = ?
      AND returned_at IS NULL
  `,
    )
    .run(new Date().toISOString(), studentId, bookId);

  res.json({
    success: true,
    changed: result.changes,
  });
});

app.get("/api/read/:bookId", (req, res) => {
  const bookId = Number(req.params.bookId);
  const studentId = Number(req.query.studentId);

  if (!studentId || !bookId) {
    return res.status(400).send("studentId və bookId lazımdır.");
  }

  const loan = db
    .prepare(
      `
    SELECT * FROM loans
    WHERE student_id = ?
      AND book_id = ?
      AND returned_at IS NULL
      AND datetime(due_at) > datetime('now')
  `,
    )
    .get(studentId, bookId);

  if (!loan) {
    return res.status(403).send("Bu əsəri oxumaq üçün aktiv giriş yoxdur.");
  }

  const book = db.prepare("SELECT * FROM books WHERE id = ?").get(bookId);

  if (!book) {
    return res.status(404).send("Əsər tapılmadı.");
  }

  const pdfPath = path.join(__dirname, "public", book.pdf_path);

  res.sendFile(pdfPath);
});

app.listen(PORT, () => {
  console.log(`ZAL Library backend işləyir: http://localhost:${PORT}`);
});
