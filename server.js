const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");
const { PDFDocument } = require("pdf-lib");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const adminSessions = new Map();

function loadAdmins() {
  const adminsPath = path.join(__dirname, "admins.json");
  if (!fs.existsSync(adminsPath)) return [];
  return JSON.parse(fs.readFileSync(adminsPath, "utf-8"));
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Admin girişi tələb olunur." });
  }

  const token = authHeader.replace("Bearer ", "");
  const admin = adminSessions.get(token);

  if (!admin) {
    return res.status(401).json({ error: "Admin sessiyası etibarsızdır." });
  }

  req.admin = admin;
  next();
}

const booksFolder = path.join(__dirname, "public", "books");
if (!fs.existsSync(booksFolder)) fs.mkdirSync(booksFolder, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, booksFolder),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase() || ".pdf";
    const baseName = path
      .basename(file.originalname, extension)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9а-яёəğıöşüç_.-]/gi, "");

    cb(null, Date.now() + "-" + baseName + extension);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Yalnız PDF faylları qəbul olunur."));
    }
    cb(null, true);
  },
});

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

async function getPdfPageCount(filePath) {
  const pdfBytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  return pdfDoc.getPageCount();
}

app.post("/api/login", (req, res) => {
  const { studentCode, password } = req.body;

  if (!studentCode || !/^\d{4}$/.test(studentCode)) {
    return res.status(400).json({ error: "4 rəqəmli şagird kodu lazımdır." });
  }

  if (!password) {
    return res.status(400).json({ error: "Şifrə lazımdır." });
  }

  const student = db
    .prepare("SELECT * FROM students WHERE student_code = ?")
    .get(studentCode);

  if (!student) return res.status(404).json({ error: "Şagird tapılmadı." });
  if (student.password !== password)
    return res.status(401).json({ error: "Şifrə yanlışdır." });

  res.json({
    student: {
      id: student.id,
      studentCode: student.student_code,
      name: student.name,
      surname: student.surname,
      className: student.class_name,
    },
  });
});

app.get("/api/books", (req, res) => {
  const books = db
    .prepare(
      `
      SELECT
        books.*,
        CASE
          WHEN active_loans.id IS NOT NULL THEN 1
          ELSE 0
        END AS is_borrowed,
        active_loans.due_at AS borrowed_due_at
      FROM books
      LEFT JOIN loans AS active_loans
        ON active_loans.book_id = books.id
        AND active_loans.returned_at IS NULL
        AND datetime(active_loans.due_at) > datetime('now')
      ORDER BY books.title ASC
      `,
    )
    .all();

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
    isBorrowed: Boolean(book.is_borrowed),
    borrowedDueAt: book.borrowed_due_at,
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
  if (!book) return res.status(404).json({ error: "Əsər tapılmadı." });

  const activeBookLoan = db
    .prepare(
      `
    SELECT
      loans.*,
      students.name,
      students.surname
    FROM loans
    LEFT JOIN students ON loans.student_id = students.id
    WHERE loans.book_id = ?
      AND loans.returned_at IS NULL
      AND datetime(loans.due_at) > datetime('now')
    `,
    )
    .get(bookId);

  if (
    activeBookLoan &&
    Number(activeBookLoan.student_id) !== Number(studentId)
  ) {
    return res.status(409).json({
      error: "Bu kitab hazırda başqa şagird tərəfindən götürülüb.",
    });
  }

  const activeLoan = db
    .prepare(
      `
      SELECT loans.*, books.title
      FROM loans
      JOIN books ON loans.book_id = books.id
      WHERE loans.student_id = ?
        AND loans.returned_at IS NULL
        AND datetime(loans.due_at) > datetime('now')
    `,
    )
    .get(studentId);

  if (activeLoan) {
    return res.status(409).json({
      error: `Sən artıq "${activeLoan.title}" əsərini götürmüsən. Yeni əsər götürmək üçün əvvəlcə onu qaytar.`,
    });
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

  res.json({ success: true, changed: result.changes });
});

app.get("/api/read/:bookId", (req, res) => {
  const bookId = Number(req.params.bookId);
  const studentId = Number(req.query.studentId);

  if (!studentId || !bookId)
    return res.status(400).send("studentId və bookId lazımdır.");

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

  if (!loan)
    return res.status(403).send("Bu əsəri oxumaq üçün aktiv giriş yoxdur.");

  const book = db.prepare("SELECT * FROM books WHERE id = ?").get(bookId);
  if (!book) return res.status(404).send("Əsər tapılmadı.");

  const pdfPath = path.join(__dirname, "public", book.pdf_path);
  if (!fs.existsSync(pdfPath))
    return res.status(404).send("PDF faylı tapılmadı.");

  res.sendFile(pdfPath);
});

app.post("/api/feedback", (req, res) => {
  const { studentId, name, category, rating, message } = req.body;

  const cleanName = String(name || "").trim();
  const cleanCategory = String(category || "").trim();
  const cleanMessage = String(message || "").trim();
  const numericRating = Number(rating);

  if (!cleanCategory)
    return res.status(400).json({ error: "Rəy növü seçilməlidir." });
  if (!numericRating || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ error: "Qiymət 1-dən 5-ə qədər olmalıdır." });
  }
  if (cleanMessage.length < 5)
    return res.status(400).json({ error: "Rəy ən azı 5 simvol olmalıdır." });
  if (cleanMessage.length > 1000)
    return res.status(400).json({ error: "Rəy çox uzundur." });

  let finalStudentId = null;
  if (studentId) {
    const student = db
      .prepare("SELECT id FROM students WHERE id = ?")
      .get(studentId);
    if (student) finalStudentId = student.id;
  }

  const result = db
    .prepare(
      `
      INSERT INTO feedbacks (student_id, name, category, rating, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    )
    .run(
      finalStudentId,
      cleanName,
      cleanCategory,
      numericRating,
      cleanMessage,
      new Date().toISOString(),
    );

  res.json({ success: true, feedbackId: result.lastInsertRowid });
});

app.get("/api/feedbacks", (req, res) => {
  const feedbacks = db
    .prepare(
      `
      SELECT
        id,
        COALESCE(NULLIF(TRIM(name), ''), 'Anonim istifadəçi') AS name,
        category,
        rating,
        message,
        created_at
      FROM feedbacks
      WHERE COALESCE(status, 'new') != 'hidden'
      ORDER BY datetime(created_at) DESC
      LIMIT 20
    `,
    )
    .all();

  res.json(feedbacks);
});

app.post("/api/book-requests", (req, res) => {
  const { studentId, requesterName, title, author, language, reason } =
    req.body;

  const cleanTitle = String(title || "").trim();
  const cleanAuthor = String(author || "").trim();
  const cleanLanguage = String(language || "").trim();
  const cleanReason = String(reason || "").trim();
  const cleanRequesterName = String(requesterName || "").trim();

  if (cleanTitle.length < 2)
    return res
      .status(400)
      .json({ error: "Kitab adı ən azı 2 simvol olmalıdır." });
  if (cleanReason.length > 600)
    return res.status(400).json({ error: "İzah çox uzundur." });

  let finalStudentId = null;
  if (studentId) {
    const student = db
      .prepare("SELECT id FROM students WHERE id = ?")
      .get(studentId);
    if (student) finalStudentId = student.id;
  }

  const result = db
    .prepare(
      `
      INSERT INTO book_requests (student_id, requester_name, title, author, language, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .run(
      finalStudentId,
      cleanRequesterName,
      cleanTitle,
      cleanAuthor,
      cleanLanguage,
      cleanReason,
      new Date().toISOString(),
    );

  res.json({ success: true, requestId: result.lastInsertRowid });
});

app.get("/api/impact", (req, res) => {
  const books = db.prepare("SELECT COUNT(*) AS count FROM books").get().count;
  const students = db
    .prepare("SELECT COUNT(*) AS count FROM students")
    .get().count;
  const readings = db
    .prepare("SELECT COUNT(*) AS count FROM loans")
    .get().count;
  const activeLoans = db
    .prepare(
      "SELECT COUNT(*) AS count FROM loans WHERE returned_at IS NULL AND datetime(due_at) > datetime('now')",
    )
    .get().count;
  const feedbacks = db
    .prepare("SELECT COUNT(*) AS count FROM feedbacks")
    .get().count;
  const bookRequests = db
    .prepare("SELECT COUNT(*) AS count FROM book_requests")
    .get().count;

  res.json({ books, students, readings, activeLoans, feedbacks, bookRequests });
});

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Login və şifrə lazımdır." });
  }

  const admins = loadAdmins();
  const admin = admins.find(
    (item) => item.username === username && item.password === password,
  );

  if (!admin) {
    return res.status(401).json({ error: "Login və ya şifrə yanlışdır." });
  }

  const token = crypto.randomUUID();
  adminSessions.set(token, {
    username: admin.username,
    name: admin.name,
    role: admin.role,
  });

  res.json({
    token,
    admin: { username: admin.username, name: admin.name, role: admin.role },
  });
});

app.post(
  "/api/admin/books",
  requireAdmin,
  upload.single("pdf"),
  async (req, res) => {
    try {
      const { title, author, year, language, genre, accessStatus, note } =
        req.body;

      if (!title || !author || !language || !genre) {
        return res
          .status(400)
          .json({ error: "Başlıq, müəllif, dil və janr lazımdır." });
      }

      if (!req.file)
        return res.status(400).json({ error: "PDF faylı əlavə edilməlidir." });

      const pageCount = await getPdfPageCount(req.file.path);
      const pdfPath = `books/${req.file.filename}`;

      const result = db
        .prepare(
          `
        INSERT INTO books (title, author, year, language, genre, pages, access_status, pdf_path, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        )
        .run(
          title,
          author,
          year || "",
          language,
          genre,
          pageCount,
          accessStatus || "safe",
          pdfPath,
          note || "",
        );

      res.json({
        success: true,
        bookId: result.lastInsertRowid,
        pdfPath,
        pages: pageCount,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "PDF oxunmadı və ya kitab əlavə edilə bilmədi." });
    }
  },
);

app.get("/api/admin/feedbacks", requireAdmin, (req, res) => {
  const feedbacks = db
    .prepare(
      `
      SELECT
        feedbacks.*,
        students.name AS student_name,
        students.surname AS student_surname,
        students.class_name AS student_class
      FROM feedbacks
      LEFT JOIN students ON feedbacks.student_id = students.id
      ORDER BY datetime(feedbacks.created_at) DESC
    `,
    )
    .all();

  res.json(feedbacks);
});

app.patch("/api/admin/feedbacks/:id/status", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || "new");

  if (!["new", "reviewed", "fixed", "hidden"].includes(status)) {
    return res.status(400).json({ error: "Status düzgün deyil." });
  }

  const result = db
    .prepare("UPDATE feedbacks SET status = ? WHERE id = ?")
    .run(status, id);
  res.json({ success: true, changed: result.changes });
});

app.get("/api/admin/book-requests", requireAdmin, (req, res) => {
  const requests = db
    .prepare(
      `
      SELECT
        book_requests.*,
        students.name AS student_name,
        students.surname AS student_surname,
        students.class_name AS student_class
      FROM book_requests
      LEFT JOIN students ON book_requests.student_id = students.id
      ORDER BY datetime(book_requests.created_at) DESC
    `,
    )
    .all();

  res.json(requests);
});

app.patch("/api/admin/book-requests/:id/status", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || "new");

  if (!["new", "reviewed", "added", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Status düzgün deyil." });
  }

  const result = db
    .prepare("UPDATE book_requests SET status = ? WHERE id = ?")
    .run(status, id);
  res.json({ success: true, changed: result.changes });
});

app.get("/api/admin/analytics", requireAdmin, (req, res) => {
  const totalBooks = db
    .prepare("SELECT COUNT(*) AS count FROM books")
    .get().count;

  const totalStudents = db
    .prepare("SELECT COUNT(*) AS count FROM students")
    .get().count;

  const totalReadings = db
    .prepare("SELECT COUNT(*) AS count FROM loans")
    .get().count;

  const activeReadings = db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM loans
      WHERE returned_at IS NULL
        AND datetime(due_at) > datetime('now')
      `,
    )
    .get().count;

  const totalFeedbacks = db
    .prepare("SELECT COUNT(*) AS count FROM feedbacks")
    .get().count;

  const totalBookRequests = db
    .prepare("SELECT COUNT(*) AS count FROM book_requests")
    .get().count;

  const topBooks = db
    .prepare(
      `
      SELECT
        books.title,
        books.author,
        books.language,
        COUNT(loans.id) AS borrow_count
      FROM loans
      JOIN books ON loans.book_id = books.id
      GROUP BY books.id
      ORDER BY borrow_count DESC
      LIMIT 5
      `,
    )
    .all();

  const topGenres = db
    .prepare(
      `
      SELECT
        books.genre,
        COUNT(loans.id) AS borrow_count
      FROM loans
      JOIN books ON loans.book_id = books.id
      GROUP BY books.genre
      ORDER BY borrow_count DESC
      LIMIT 5
      `,
    )
    .all();

  const recentFeedbacks = db
    .prepare(
      `
      SELECT
        name,
        category,
        rating,
        message,
        created_at
      FROM feedbacks
      ORDER BY datetime(created_at) DESC
      LIMIT 5
      `,
    )
    .all();

  const recentBookRequests = db
    .prepare(
      `
      SELECT
        name,
        title,
        author,
        language,
        reason,
        status,
        created_at
      FROM book_requests
      ORDER BY datetime(created_at) DESC
      LIMIT 5
      `,
    )
    .all();

  res.json({
    totals: {
      books: totalBooks,
      students: totalStudents,
      readings: totalReadings,
      activeReadings,
      feedbacks: totalFeedbacks,
      bookRequests: totalBookRequests,
    },
    topBooks,
    topGenres,
    recentFeedbacks,
    recentBookRequests,
  });
});

app.get("/api/students/:studentId/history", (req, res) => {
  const studentId = Number(req.params.studentId);

  const history = db
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
        AND loans.returned_at IS NOT NULL
      ORDER BY datetime(loans.returned_at) DESC
      `,
    )
    .all(studentId);

  res.json(history);
});

app.get("/api/students/:studentId/history", (req, res) => {
  const studentId = Number(req.params.studentId);

  const history = db
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
        AND loans.returned_at IS NOT NULL
      ORDER BY datetime(loans.returned_at) DESC
      `,
    )
    .all(studentId);

  res.json(history);
});

app.listen(PORT, () => {
  console.log(
    `ZAHS Rəqəmsal Kitabxana backend işləyir: http://localhost:${PORT}`,
  );
});
