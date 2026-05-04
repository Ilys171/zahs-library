const express = require("express");
const path = require("path");
const db = require("./database");

const fs = require("fs");
const multer = require("multer");

const crypto = require("crypto");

const { PDFDocument } = require("pdf-lib");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const adminSessions = new Map();

function loadAdmins() {
  const adminsPath = path.join(__dirname, "admins.json");

  if (!fs.existsSync(adminsPath)) {
    return [];
  }

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

if (!fs.existsSync(booksFolder)) {
  fs.mkdirSync(booksFolder, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, booksFolder);
  },
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

  if (!student) {
    return res.status(404).json({ error: "Şagird tapılmadı." });
  }

  if (student.password !== password) {
    return res.status(401).json({ error: "Şifrə yanlışdır." });
  }

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

  const activeLoan = db
    .prepare(
      `
  SELECT
    loans.*,
    books.title
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

app.post(
  "/api/admin/books",
  requireAdmin,
  upload.single("pdf"),
  async (req, res) => {
    try {
      const { title, author, year, language, genre, accessStatus, note } =
        req.body;

      if (!title || !author || !language || !genre) {
        return res.status(400).json({
          error: "Başlıq, müəllif, dil və janr lazımdır.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: "PDF faylı əlavə edilməlidir.",
        });
      }

      const pdfFullPath = req.file.path;
      const pageCount = await getPdfPageCount(pdfFullPath);
      const pdfPath = `books/${req.file.filename}`;

      const result = db
        .prepare(
          `
      INSERT INTO books (
        title, author, year, language, genre, pages, access_status, pdf_path, note
      )
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

      res.status(500).json({
        error: "PDF oxunmadı və ya kitab əlavə edilə bilmədi.",
      });
    }
  },
);

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: "Login və şifrə lazımdır.",
    });
  }

  const admins = loadAdmins();

  const admin = admins.find(
    (item) => item.username === username && item.password === password,
  );

  if (!admin) {
    return res.status(401).json({
      error: "Login və ya şifrə yanlışdır.",
    });
  }

  const token = crypto.randomUUID();

  adminSessions.set(token, {
    username: admin.username,
    name: admin.name,
    role: admin.role,
  });

  res.json({
    token,
    admin: {
      username: admin.username,
      name: admin.name,
      role: admin.role,
    },
  });
});

app.post("/api/feedback", (req, res) => {
  const { studentId, name, category, rating, message } = req.body;

  const cleanCategory = String(category || "").trim();
  const cleanMessage = String(message || "").trim();
  const cleanName = String(name || "").trim();
  const numericRating = Number(rating);

  if (!cleanCategory) {
    return res.status(400).json({ error: "Rəy növü seçilməlidir." });
  }

  if (!numericRating || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ error: "Qiymət 1-dən 5-ə qədər olmalıdır." });
  }

  if (cleanMessage.length < 5) {
    return res.status(400).json({ error: "Rəy ən azı 5 simvol olmalıdır." });
  }

  if (cleanMessage.length > 1000) {
    return res.status(400).json({ error: "Rəy çox uzundur." });
  }

  let finalStudentId = null;

  if (studentId) {
    const student = db
      .prepare("SELECT id FROM students WHERE id = ?")
      .get(studentId);

    if (student) {
      finalStudentId = student.id;
    }
  }

  const result = db
    .prepare(
      `
      INSERT INTO feedbacks (
        student_id, name, category, rating, message, created_at
      )
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

  res.json({
    success: true,
    feedbackId: result.lastInsertRowid,
  });
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

app.listen(PORT, () => {
  console.log(
    `ZAHS Rəqəmsal Kitabxana backend işləyir: http://localhost:${PORT}`,
  );
});
