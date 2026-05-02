let books = [];
let activeLoans = [];

const state = {
  user: JSON.parse(localStorage.getItem("zalUserAz") || "null"),
};

const views = document.querySelectorAll(".view");
const navLinks = document.querySelectorAll(".nav-link");

const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const loginModal = document.getElementById("loginModal");
const closeLogin = document.getElementById("closeLogin");
const saveLogin = document.getElementById("saveLogin");
const studentCode = document.getElementById("studentCode");
const studentName = document.getElementById("studentName");

const infoModal = document.getElementById("infoModal");
const closeInfo = document.getElementById("closeInfo");
const infoContent = document.getElementById("infoContent");

const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const languageSelect = document.getElementById("languageSelect");
const genreSelect = document.getElementById("genreSelect");
const accessSelect = document.getElementById("accessSelect");

function saveUser() {
  localStorage.setItem("zalUserAz", JSON.stringify(state.user));
}

function removeUser() {
  localStorage.removeItem("zalUserAz");
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const contentType = response.headers.get("content-type");

  if (!response.ok) {
    if (contentType && contentType.includes("application/json")) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Xəta baş verdi.");
    }

    throw new Error("Xəta baş verdi.");
  }

  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function loadBooks() {
  books = await apiRequest("/api/books");
  fillGenres();
  renderCatalog();
  renderRecommendations();
  updateStats();
}

async function loadLoans() {
  if (!state.user) {
    activeLoans = [];
    updateStats();
    renderShelf();
    renderCatalog();
    renderRecommendations();
    return;
  }

  activeLoans = await apiRequest(`/api/students/${state.user.id}/loans`);
  updateStats();
  renderShelf();
  renderCatalog();
  renderRecommendations();
}

function normalizeLoan(loan) {
  return {
    loanId: loan.loan_id,
    bookId: loan.id,
    title: loan.title,
    author: loan.author,
    year: loan.year,
    language: loan.language,
    genre: loan.genre,
    pages: loan.pages,
    access: loan.access_status,
    pdfUrl: loan.pdf_path,
    note: loan.note,
    borrowedAt: loan.borrowed_at,
    dueAt: loan.due_at,
  };
}

function getLoanByBookId(bookId) {
  return activeLoans.find((loan) => Number(loan.id) === Number(bookId));
}

function isLoanActive(bookId) {
  return Boolean(getLoanByBookId(bookId));
}

function daysLeft(bookId) {
  const loan = getLoanByBookId(bookId);

  if (!loan) {
    return 0;
  }

  const diff = new Date(loan.due_at) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getLoanDays(book) {
  if (book.loanDays) return book.loanDays;
  if (book.pages <= 60) return 3;
  if (book.pages <= 180) return 7;
  if (book.pages <= 450) return 14;
  return 21;
}

function showView(viewId) {
  views.forEach((view) => {
    view.classList.toggle("visible", view.id === viewId);
  });

  navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.view === viewId);
  });

  renderCatalog();
  renderShelf();
  renderRecommendations();
  updateStats();
}

function updateLoginButton() {
  if (state.user) {
    loginButton.textContent = `${state.user.studentCode} · ${state.user.name || "Şagird"}`;
    loginButton.classList.add("hidden");
    logoutButton.classList.remove("hidden");
  } else {
    loginButton.textContent = "Daxil ol";
    loginButton.classList.remove("hidden");
    logoutButton.classList.add("hidden");
  }
}

function updateStats() {
  document.getElementById("totalBooks").textContent = books.length;
  document.getElementById("safeBooks").textContent = books.filter(
    (book) => book.access === "safe",
  ).length;
  document.getElementById("borrowedBooks").textContent = activeLoans.length;
}

function fillGenres() {
  const currentValue = genreSelect.value;

  genreSelect.innerHTML = `<option value="all">Hamısı</option>`;

  const genres = [...new Set(books.map((book) => book.genre))].sort();

  genres.forEach((genre) => {
    const option = document.createElement("option");
    option.value = genre;
    option.textContent = genre;
    genreSelect.appendChild(option);
  });

  genreSelect.value = currentValue || "all";
}

function filteredBooks() {
  const query = searchInput.value.trim().toLowerCase();

  let result = books.filter((book) => {
    const text = [
      book.title,
      book.author,
      book.genre,
      book.language,
      book.note || "",
    ]
      .join(" ")
      .toLowerCase();

    const matchesQuery = text.includes(query);
    const matchesLanguage =
      languageSelect.value === "all" || book.language === languageSelect.value;
    const matchesGenre =
      genreSelect.value === "all" || book.genre === genreSelect.value;
    const matchesAccess =
      accessSelect.value === "all" || book.access === accessSelect.value;

    return matchesQuery && matchesLanguage && matchesGenre && matchesAccess;
  });

  result.sort((a, b) => {
    if (sortSelect.value === "az") return a.title.localeCompare(b.title);
    if (sortSelect.value === "za") return b.title.localeCompare(a.title);
    if (sortSelect.value === "author") return a.author.localeCompare(b.author);
    if (sortSelect.value === "short") return a.pages - b.pages;
    return 0;
  });

  return result;
}

function bookCard(book) {
  const active = isLoanActive(book.id);
  const remaining = daysLeft(book.id);
  const loanDays = getLoanDays(book);

  const card = document.createElement("article");
  card.className = "book-card";

  card.innerHTML = `
    <div class="cover">
      <small>${book.language} · ${book.genre}</small>
      <strong>${book.title}</strong>
      <small>${book.author}</small>
    </div>

    <div class="book-meta">
      <span class="pill gold">${book.year || "—"}</span>
      <span class="pill">${book.pages} səh.</span>
      <span class="pill ${book.access === "safe" ? "safe" : "review"}">
        ${book.access === "safe" ? "təhlükəsiz başlanğıc" : "versiya yoxlanmalıdır"}
      </span>
      <span class="pill">${loanDays} günlük giriş</span>
      ${active ? `<span class="pill safe">${remaining} gün qalıb</span>` : ""}
    </div>

    <div>
      <h3>${book.title}</h3>
      <p>${book.author}</p>
      <p>${book.note || ""}</p>
    </div>

    <div class="card-actions">
      ${
        active
          ? `<button class="preview" data-open="${book.id}">Aç</button>
             <button class="return" data-return="${book.id}">Qaytar</button>`
          : `<button class="borrow" data-borrow="${book.id}">${loanDays} gün götür</button>
             <button class="preview" data-info="${book.id}">Məlumat</button>`
      }
    </div>
  `;

  return card;
}

function renderCatalog() {
  const grid = document.getElementById("catalogGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const list = filteredBooks();

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">Heç nə tapılmadı. Filtrləri dəyişməyə çalış.</div>`;
    return;
  }

  list.forEach((book) => {
    grid.appendChild(bookCard(book));
  });
}

function renderShelf() {
  const grid = document.getElementById("shelfGrid");
  if (!grid) return;

  grid.innerHTML = "";

  if (!activeLoans.length) {
    grid.innerHTML = `
      <div class="empty-state">
        Hələ aktiv əsər yoxdur. Kataloqa keç və “götür” düyməsinə bas.
      </div>
    `;
    return;
  }

  activeLoans.forEach((loan) => {
    const book = books.find((item) => Number(item.id) === Number(loan.id));

    if (book) {
      grid.appendChild(bookCard(book));
    }
  });
}

function renderRecommendations() {
  const container = document.getElementById("recommendations");
  if (!container) return;

  let recs;

  if (activeLoans.length) {
    const borrowedGenres = new Set(activeLoans.map((loan) => loan.genre));

    recs = books
      .filter((book) => !isLoanActive(book.id))
      .map((book) => ({
        book,
        score: borrowedGenres.has(book.genre) ? 1 : 0,
      }))
      .sort((a, b) => b.score - a.score || a.book.pages - b.book.pages)
      .slice(0, 6)
      .map((item) => item.book);
  } else {
    recs = books.slice(0, 6);
  }

  container.innerHTML = "";

  recs.forEach((book) => {
    container.appendChild(bookCard(book));
  });
}

async function loginUser() {
  const code = studentCode.value.trim();

  if (!/^\d{4}$/.test(code)) {
    alert("4 rəqəmli şagird kodu daxil et.");
    return;
  }

  try {
    const data = await apiRequest("/api/login", {
      method: "POST",
      body: JSON.stringify({
        studentCode: code,
      }),
    });

    state.user = data.student;
    saveUser();

    updateLoginButton();
    loginModal.classList.add("hidden");

    await loadLoans();
  } catch (error) {
    alert(error.message);
  }
}

function openLogin() {
  loginModal.classList.remove("hidden");
  studentCode.focus();
}

function logoutUser() {
  state.user = null;
  activeLoans = [];

  removeUser();

  updateLoginButton();
  updateStats();
  renderCatalog();
  renderShelf();
  renderRecommendations();

  alert("Hesabdan çıxış edildi.");
}

async function borrowBook(bookId) {
  if (!state.user) {
    openLogin();
    return;
  }

  try {
    await apiRequest("/api/borrow", {
      method: "POST",
      body: JSON.stringify({
        studentId: state.user.id,
        bookId: Number(bookId),
      }),
    });

    await loadLoans();
  } catch (error) {
    alert(error.message);
  }
}

async function returnBook(bookId) {
  if (!state.user) {
    openLogin();
    return;
  }

  try {
    await apiRequest("/api/return", {
      method: "POST",
      body: JSON.stringify({
        studentId: state.user.id,
        bookId: Number(bookId),
      }),
    });

    await loadLoans();
  } catch (error) {
    alert(error.message);
  }
}

function showBookInfo(bookId) {
  const book = books.find((item) => Number(item.id) === Number(bookId));

  if (!book) {
    return;
  }

  infoContent.innerHTML = `
    <p class="eyebrow">${book.genre} · ${book.language}</p>
    <h2 class="reader-title">${book.title}</h2>
    <p><strong>${book.author}</strong> · ${book.year || "—"}</p>

    <div class="notice">
      Giriş müddəti: <strong>${getLoanDays(book)} gün</strong><br>
      Status: <strong>${book.access === "safe" ? "təhlükəsiz başlanğıc" : "versiya yoxlanmalıdır"}</strong>
    </div>

    <div class="reader-body">
      <p>${book.note || ""}</p>
      <p>PDF yolu: <strong>${book.pdfUrl}</strong></p>
      <p>Tam oxumaq üçün əvvəlcə əsəri götür.</p>
    </div>
  `;

  infoModal.classList.remove("hidden");
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function openReader(bookId) {
  if (!state.user) {
    openLogin();
    return;
  }

  if (!isLoanActive(bookId)) {
    alert("Əsəri oxumaq üçün əvvəlcə onu götürməlisən.");
    return;
  }

  const book = books.find((item) => Number(item.id) === Number(bookId));

  if (!book) {
    alert("Əsər tapılmadı.");
    return;
  }

  const readerWindow = window.open("", "_blank");

  if (!readerWindow) {
    alert("Brauzer yeni pəncərəni blokladı. Pop-up icazəsini aktiv et.");
    return;
  }

  const remaining = daysLeft(bookId);
  const readUrl = `/api/read/${bookId}?studentId=${state.user.id}`;

  readerWindow.document.write(`
    <!DOCTYPE html>
    <html lang="az">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(book.title)}</title>
      <style>
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #e9edf3;
          font-family: Arial, sans-serif;
        }

        .topbar {
          height: 58px;
          background: #0f2747;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 22px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
        }

        .topbar span {
          color: #d8c28a;
          font-size: 14px;
        }

        iframe {
          width: 100%;
          height: calc(100vh - 58px);
          border: none;
          background: white;
        }

        .watermark {
          position: fixed;
          right: 18px;
          bottom: 18px;
          color: rgba(15, 39, 71, 0.55);
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(15, 39, 71, 0.12);
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 13px;
        }
      </style>
    </head>

    <body>
      <div class="topbar">
        <strong>${escapeHtml(book.title)}</strong>
        <span>${remaining} gün qalıb · Şagird kodu: ${escapeHtml(state.user.studentCode)}</span>
      </div>

      <iframe src="${readUrl}"></iframe>

      <div class="watermark">
        ZAL Library · Student ${escapeHtml(state.user.studentCode)}
      </div>
    </body>
    </html>
  `);

  readerWindow.document.close();
}

document.body.addEventListener("click", (event) => {
  const borrowId = event.target.dataset.borrow;
  const returnId = event.target.dataset.return;
  const openId = event.target.dataset.open;
  const infoId = event.target.dataset.info;
  const go = event.target.dataset.go;
  const categoryCard = event.target.closest(".category-card");
  const genre = categoryCard ? categoryCard.dataset.genre : null;

  if (borrowId) borrowBook(borrowId);
  if (returnId) returnBook(returnId);
  if (openId) openReader(openId);
  if (infoId) showBookInfo(infoId);
  if (go) showView(go);

  if (genre) {
    showView("catalog");
    genreSelect.value = genre;
    renderCatalog();
  }
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    showView(link.dataset.view);
  });
});

[searchInput, sortSelect, languageSelect, genreSelect, accessSelect].forEach(
  (input) => {
    input.addEventListener("input", renderCatalog);
  },
);

loginButton.addEventListener("click", openLogin);
logoutButton.addEventListener("click", logoutUser);

closeLogin.addEventListener("click", () => {
  loginModal.classList.add("hidden");
});

closeInfo.addEventListener("click", () => {
  infoModal.classList.add("hidden");
});

saveLogin.addEventListener("click", loginUser);

async function init() {
  updateLoginButton();

  try {
    await loadBooks();

    if (state.user) {
      await loadLoans();
    } else {
      renderShelf();
    }
  } catch (error) {
    alert("Backend ilə əlaqə alınmadı. Serverin işlədiyinə əmin ol.");
    console.error(error);
  }
}

init();
