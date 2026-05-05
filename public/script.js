let books = [];
let activeLoans = [];
let readingHistory = [];

const state = {
  user: JSON.parse(localStorage.getItem("zahsUser") || "null"),
};

const views = document.querySelectorAll(".view");
const navLinks = document.querySelectorAll(".nav-link");

const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const accountLabel = document.getElementById("accountLabel");

const loginModal = document.getElementById("loginModal");
const closeLogin = document.getElementById("closeLogin");
const saveLogin = document.getElementById("saveLogin");
const studentCode = document.getElementById("studentCode");
const studentPassword = document.getElementById("studentPassword");

const infoModal = document.getElementById("infoModal");
const closeInfo = document.getElementById("closeInfo");
const infoContent = document.getElementById("infoContent");

const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const languageSelect = document.getElementById("languageSelect");
const genreSelect = document.getElementById("genreSelect");
const accessSelect = null;

const headerSearch = document.getElementById("headerSearch");
const headerSearchButton = document.getElementById("headerSearchButton");

const mobileMenuButton = document.getElementById("mobileMenuButton");
const mainNav = document.getElementById("mainNav");
const loginHeroBtn = document.getElementById("loginHeroBtn");

const langButtons = document.querySelectorAll(".lang-btn");

const feedbackForm = document.getElementById("feedbackForm");
const feedbackName = document.getElementById("feedbackName");
const feedbackCategory = document.getElementById("feedbackCategory");
const feedbackRating = document.getElementById("feedbackRating");
const feedbackMessage = document.getElementById("feedbackMessage");
const feedbackStatus = document.getElementById("feedbackStatus");

const openFeedbacksButton = document.getElementById("openFeedbacksButton");
const feedbacksModal = document.getElementById("feedbacksModal");
const closeFeedbacks = document.getElementById("closeFeedbacks");
const feedbacksList = document.getElementById("feedbacksList");

const historyGrid = document.getElementById("historyGrid");

const appToast = document.getElementById("appToast");
let appToastTimer = null;

const bookRequestForm = document.getElementById("bookRequestForm");
const requestName = document.getElementById("requestName");
const requestTitle = document.getElementById("requestTitle");
const requestAuthor = document.getElementById("requestAuthor");
const requestLanguage = document.getElementById("requestLanguage");
const requestReason = document.getElementById("requestReason");
const requestStatus = document.getElementById("requestStatus");

const impactBooks = document.getElementById("impactBooks");
const impactUsers = document.getElementById("impactUsers");
const impactReadings = document.getElementById("impactReadings");
const impactFeedbacks = document.getElementById("impactFeedbacks");
const impactRequests = document.getElementById("impactRequests");

let revealObserver = null;

const translations = window.ZAHS_TRANSLATIONS || {};
let currentLang = localStorage.getItem("zahsLang") || "az";

function saveUser() {
  localStorage.setItem("zahsUser", JSON.stringify(state.user));
}

function removeUser() {
  localStorage.removeItem("zahsUser");
}

function t(key) {
  return translations[currentLang]?.[key] || translations.az?.[key] || key;
}

function getDayWord(number) {
  const value = Math.abs(Number(number));

  if (currentLang === "ru") {
    const lastTwo = value % 100;
    const lastOne = value % 10;

    if (lastTwo >= 11 && lastTwo <= 14) return t("dayMany");
    if (lastOne === 1) return t("dayOne");
    if (lastOne >= 2 && lastOne <= 4) return t("dayFew");

    return t("dayMany");
  }

  if (currentLang === "en") {
    return value === 1 ? t("dayOne") : t("dayMany");
  }

  return t("dayMany");
}

function getAccessText(days) {
  if (currentLang === "az") {
    return `${days} günlük ${t("accessWord")}`;
  }

  return `${days} ${getDayWord(days)} ${t("accessWord")}`;
}

function getDaysLeftText(days) {
  if (currentLang === "az") {
    return `${days} gün qalıb`;
  }

  if (currentLang === "ru") {
    return `Осталось ${days} ${getDayWord(days)}`;
  }

  return `${days} ${getDayWord(days)} left`;
}

function getBorrowText(days) {
  if (currentLang === "az") {
    return `${days} gün ${t("borrowSuffix")}`;
  }

  return `${t("borrowPrefix")} ${days} ${getDayWord(days)}`;
}

function applyTranslations() {
  document.documentElement.lang = currentLang;
  document.documentElement.dataset.langTheme = currentLang;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  if (headerSearch) headerSearch.placeholder = t("searchPlaceholder");
  if (searchInput) searchInput.placeholder = t("catalogSearchPlaceholder");

  if (feedbackName) feedbackName.placeholder = t("feedbackNamePlaceholder");
  if (feedbackMessage) {
    feedbackMessage.placeholder = t("feedbackMessagePlaceholder");
  }

  if (studentPassword) studentPassword.placeholder = t("passwordPlaceholder");

  if (requestName) requestName.placeholder = t("requestNamePlaceholder");
  if (requestTitle) requestTitle.placeholder = t("requestTitlePlaceholder");
  if (requestAuthor) requestAuthor.placeholder = t("requestAuthorPlaceholder");
  if (requestReason) requestReason.placeholder = t("requestReasonPlaceholder");

  langButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === currentLang);
  });
}

function setLanguage(lang) {
  if (!translations[lang]) return;

  currentLang = lang;
  localStorage.setItem("zahsLang", lang);

  applyTranslations();
  updateLoginButton();
  fillGenres();
  renderCatalog();
  renderShelf();
  renderRecommendations();
  renderHistory();
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
    renderHistory();
    return;
  }

  activeLoans = await apiRequest(`/api/students/${state.user.id}/loans`);

  updateStats();
  renderShelf();
  renderCatalog();
  renderRecommendations();

  await loadHistory();
}

async function loadHistory() {
  if (!state.user) {
    readingHistory = [];
    renderHistory();
    return;
  }

  readingHistory = await apiRequest(`/api/students/${state.user.id}/history`);
  renderHistory();
}

async function loadImpactStats() {
  try {
    const stats = await apiRequest("/api/impact");

    if (impactBooks) impactBooks.textContent = stats.books ?? 0;
    if (impactUsers) impactUsers.textContent = stats.students ?? 0;
    if (impactReadings) impactReadings.textContent = stats.readings ?? 0;
    if (impactFeedbacks) impactFeedbacks.textContent = stats.feedbacks ?? 0;
    if (impactRequests) impactRequests.textContent = stats.bookRequests ?? 0;
  } catch (error) {
    console.error("Impact stats could not be loaded:", error);
  }
}

function getLoanByBookId(bookId) {
  return activeLoans.find((loan) => Number(loan.id) === Number(bookId));
}

function isLoanActive(bookId) {
  return Boolean(getLoanByBookId(bookId));
}

function daysLeft(bookId) {
  const loan = getLoanByBookId(bookId);

  if (!loan) return 0;

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

function closeMobileMenu() {
  if (!mobileMenuButton || !mainNav) return;

  mainNav.classList.remove("open");
  mobileMenuButton.classList.remove("active");
  mobileMenuButton.setAttribute("aria-expanded", "false");
}

function toggleMobileMenu() {
  if (!mobileMenuButton || !mainNav) return;

  const isOpen = mainNav.classList.toggle("open");

  mobileMenuButton.classList.toggle("active", isOpen);
  mobileMenuButton.setAttribute("aria-expanded", String(isOpen));
}

function showView(viewId) {
  views.forEach((view) => {
    view.classList.toggle("visible", view.id === viewId);
  });

  navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.view === viewId);
  });

  closeMobileMenu();

  renderCatalog();
  renderShelf();
  renderRecommendations();
  renderHistory();
  updateStats();
  observeRevealElements();

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function updateLoginButton() {
  if (!loginButton || !logoutButton || !accountLabel) return;

  if (state.user) {
    const name = state.user.name || "Şagird";
    const surname = state.user.surname || "";
    const className = state.user.className || state.user.class_name || "";

    accountLabel.textContent = `${name} ${surname} · ${className}`;
    accountLabel.classList.remove("hidden");

    loginButton.classList.add("hidden");
    logoutButton.classList.remove("hidden");

    if (loginHeroBtn) {
      loginHeroBtn.textContent = t("goCatalog");
    }
  } else {
    accountLabel.textContent = "";
    accountLabel.classList.add("hidden");

    loginButton.textContent = t("login");
    loginButton.classList.remove("hidden");
    logoutButton.classList.add("hidden");

    if (loginHeroBtn) {
      loginHeroBtn.textContent = t("studentLogin");
    }
  }
}

function updateStats() {
  const totalBooks = document.getElementById("totalBooks");
  const borrowedBooks = document.getElementById("borrowedBooks");

  if (totalBooks) totalBooks.textContent = books.length;
  if (borrowedBooks) borrowedBooks.textContent = activeLoans.length;
}

function fillGenres() {
  if (!genreSelect) return;

  const currentValue = genreSelect.value;

  genreSelect.innerHTML = `<option value="all">${t("allOption")}</option>`;

  const genres = [...new Set(books.map((book) => book.genre))].sort();

  genres.forEach((genre) => {
    const option = document.createElement("option");
    option.value = genre;
    option.textContent = genre;
    genreSelect.appendChild(option);
  });

  genreSelect.value = [...genreSelect.options].some(
    (option) => option.value === currentValue,
  )
    ? currentValue
    : "all";
}

function filteredBooks() {
  const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

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
      !languageSelect ||
      languageSelect.value === "all" ||
      book.language === languageSelect.value;

    const matchesGenre =
      !genreSelect ||
      genreSelect.value === "all" ||
      book.genre === genreSelect.value;

    const matchesAccess =
      !accessSelect ||
      accessSelect.value === "all" ||
      book.access === accessSelect.value;

    return matchesQuery && matchesLanguage && matchesGenre && matchesAccess;
  });

  result.sort((a, b) => {
    if (!sortSelect) return 0;
    if (sortSelect.value === "az") return a.title.localeCompare(b.title);
    if (sortSelect.value === "za") return b.title.localeCompare(a.title);
    if (sortSelect.value === "author") return a.author.localeCompare(b.author);
    if (sortSelect.value === "short") return a.pages - b.pages;
    return 0;
  });

  return result;
}

function showToast(message, type = "success") {
  if (!appToast) return;

  clearTimeout(appToastTimer);

  appToast.textContent = message;
  appToast.className = `app-toast ${type}`;
  appToast.classList.remove("hidden");

  requestAnimationFrame(() => {
    appToast.classList.add("show");
  });

  appToastTimer = setTimeout(() => {
    appToast.classList.remove("show");

    setTimeout(() => {
      appToast.classList.add("hidden");
    }, 220);
  }, 2600);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function loginPromptCard(title, text) {
  return `
    <div class="login-prompt-card">
      <div>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(text)}</p>
      </div>

      <button class="primary" type="button" data-login-open="true">
        ${escapeHtml(t("loginNow"))}
      </button>
    </div>
  `;
}

function bookCard(book) {
  const active = isLoanActive(book.id);
  const loan = getLoanByBookId(book.id);
  const remaining = daysLeft(book.id);
  const loanDays = getLoanDays(book);
  const hasAnyActiveLoan = activeLoans.length > 0;
  const languageClass = `cover-${String(book.language || "").toLowerCase()}`;
  const takenByOther = book.isBorrowed && !active;

  const card = document.createElement("article");
  card.className = "book-card reveal";

  card.innerHTML = `
    <div class="cover ${languageClass}">
      <small>${escapeHtml(book.language)} · ${escapeHtml(book.genre)}</small>
      <strong>${escapeHtml(book.title)}</strong>
      <small>${escapeHtml(book.author)}</small>
    </div>

    <div class="book-meta">
      <span class="pill gold">${escapeHtml(book.year || "—")}</span>
      <span class="pill">${book.pages} ${t("pagesShort")}</span>
      <span class="pill">${getAccessText(loanDays)}</span>

      ${
        active
          ? `<span class="pill safe">${getDaysLeftText(remaining)}</span>`
          : ""
      }

      ${
        active && loan
          ? `<span class="pill history-date">${t("dueDate")}: ${escapeHtml(
              formatDueDate(loan.due_at),
            )}</span>`
          : ""
      }

      ${
        takenByOther
          ? `<span class="pill review">${t("alreadyBorrowed")}</span>`
          : ""
      }
    </div>

    <div>
      <h3>${escapeHtml(book.title)}</h3>
      <p>${escapeHtml(book.author)}</p>
      <p>${escapeHtml(book.note || "")}</p>
      ${
        takenByOther
          ? `<p><strong>${escapeHtml(t("alreadyBorrowedText"))}</strong></p>`
          : ""
      }
    </div>

    <div class="card-actions">
      ${
        active
          ? `<button class="preview" data-open="${book.id}">${t("openBook")}</button>
             <button class="return" data-return="${book.id}">${t("returnBook")}</button>`
          : takenByOther
            ? `<button class="disabled-btn" disabled>${t("alreadyBorrowed")}</button>
               <button class="preview" data-info="${book.id}">${t("bookInfo")}</button>`
            : hasAnyActiveLoan
              ? `<button class="disabled-btn" disabled>${t("previousBookReturn")}</button>
                 <button class="preview" data-info="${book.id}">${t("bookInfo")}</button>`
              : `<button class="borrow" data-borrow="${book.id}">${getBorrowText(loanDays)}</button>
                 <button class="preview" data-info="${book.id}">${t("bookInfo")}</button>`
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
    grid.innerHTML = `<div class="empty-state">${t("emptyCatalog")}</div>`;
    return;
  }

  list.forEach((book) => {
    grid.appendChild(bookCard(book));
  });

  observeRevealElements();
}

function renderShelf() {
  const grid = document.getElementById("shelfGrid");

  if (!grid) return;

  grid.innerHTML = "";

  if (!state.user) {
    grid.innerHTML = loginPromptCard(
      t("historyLoginTitle"),
      t("historyLoginText"),
    );
    return;
  }

  if (!activeLoans.length) {
    grid.innerHTML = `
      <div class="empty-state">
        ${t("emptyShelf")}
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

  observeRevealElements();
}

function historyBookCard(book) {
  const card = document.createElement("article");
  const languageClass = `cover-${String(book.language || "").toLowerCase()}`;

  card.className = "book-card reveal";

  card.innerHTML = `
    <div class="cover ${languageClass}">
      <small>${escapeHtml(book.language)} · ${escapeHtml(book.genre)}</small>
      <strong>${escapeHtml(book.title)}</strong>
      <small>${escapeHtml(book.author)}</small>
    </div>

    <div class="book-meta">
      <span class="pill gold">${escapeHtml(book.year || "—")}</span>
      <span class="pill">${book.pages} ${t("pagesShort")}</span>
      <span class="pill history-date">
        ${t("returnedAt")}: ${escapeHtml(formatFeedbackDate(book.returned_at))}
      </span>
    </div>

    <div>
      <h3>${escapeHtml(book.title)}</h3>
      <p>${escapeHtml(book.author)}</p>
      <p>${escapeHtml(book.note || "")}</p>
    </div>

    <div class="card-actions">
      <button class="preview" data-info="${book.id}">
        ${t("bookInfo")}
      </button>
    </div>
  `;

  return card;
}

function renderHistory() {
  if (!historyGrid) return;

  historyGrid.innerHTML = "";

  if (!state.user) {
    historyGrid.innerHTML = loginPromptCard(
      t("historyLoginTitle"),
      t("historyLoginText"),
    );
    return;
  }

  if (!readingHistory.length) {
    historyGrid.innerHTML = `
      <div class="empty-state">
        ${t("noReadHistory")}
      </div>
    `;
    return;
  }

  readingHistory.forEach((book) => {
    historyGrid.appendChild(historyBookCard(book));
  });

  observeRevealElements();
}

function renderRecommendations() {
  const container = document.getElementById("recommendations");

  if (!container) return;

  container.innerHTML = "";

  if (!state.user) {
    container.innerHTML = loginPromptCard(
      t("recommendLoginTitle"),
      t("recommendLoginText"),
    );
    return;
  }

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
  } else if (readingHistory.length) {
    const readGenres = new Set(readingHistory.map((book) => book.genre));

    recs = books
      .filter(
        (book) =>
          !readingHistory.some(
            (historyBook) => Number(historyBook.id) === Number(book.id),
          ),
      )
      .map((book) => ({
        book,
        score: readGenres.has(book.genre) ? 1 : 0,
      }))
      .sort((a, b) => b.score - a.score || a.book.pages - b.book.pages)
      .slice(0, 6)
      .map((item) => item.book);
  } else {
    recs = books.slice(0, 6);
  }

  recs.forEach((book) => {
    container.appendChild(bookCard(book));
  });

  observeRevealElements();
}

async function loginUser() {
  const code = studentCode.value.trim();
  const password = studentPassword.value.trim();

  if (!/^\d{4}$/.test(code)) {
    alert(t("loginCodeAlert"));
    return;
  }

  if (!password) {
    alert(t("passwordAlert"));
    return;
  }

  try {
    const data = await apiRequest("/api/login", {
      method: "POST",
      body: JSON.stringify({
        studentCode: code,
        password,
      }),
    });

    state.user = data.student;
    saveUser();

    updateLoginButton();
    loginModal.classList.add("hidden");

    studentCode.value = "";
    studentPassword.value = "";

    await loadBooks();
    await loadLoans();

    showToast(t("loginSuccess"), "success");
  } catch (error) {
    alert(error.message);
  }
}

function openLogin() {
  if (!loginModal) return;

  loginModal.classList.remove("hidden");

  if (studentCode) {
    studentCode.focus();
  }
}

function logoutUser() {
  state.user = null;
  activeLoans = [];
  readingHistory = [];

  removeUser();

  updateLoginButton();
  updateStats();
  renderCatalog();
  renderShelf();
  renderRecommendations();
  renderHistory();

  showToast(t("logoutAlert"), "success");
}

async function borrowBook(bookId) {
  if (!state.user) {
    openLogin();
    return;
  }

  if (activeLoans.length > 0) {
    alert(t("activeLoanAlert"));
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

    await loadBooks();
    await loadLoans();
    await loadImpactStats();
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

    await loadBooks();
    await loadLoans();
    await loadImpactStats();
  } catch (error) {
    alert(error.message);
  }
}

function showBookInfo(bookId) {
  const book = books.find((item) => Number(item.id) === Number(bookId));

  if (!book || !infoContent) return;

  infoContent.innerHTML = `
    <p class="eyebrow">${escapeHtml(book.genre)} · ${escapeHtml(book.language)}</p>
    <h2 class="reader-title">${escapeHtml(book.title)}</h2>
    <p><strong>${escapeHtml(book.author)}</strong> · ${escapeHtml(book.year || "—")}</p>

    <div class="notice">
      ${getAccessText(getLoanDays(book))}<br>
      ${book.pages} ${t("pagesShort")}
    </div>

    <div class="reader-body">
      <p>${escapeHtml(book.note || "")}</p>
    </div>
  `;

  infoModal.classList.remove("hidden");
}

function openReader(bookId) {
  if (!state.user) {
    openLogin();
    return;
  }

  if (!isLoanActive(bookId)) {
    alert(t("needBorrowAlert"));
    return;
  }

  const book = books.find((item) => Number(item.id) === Number(bookId));

  if (!book) {
    alert(t("bookNotFoundAlert"));
    return;
  }

  const readerWindow = window.open("", "_blank");

  if (!readerWindow) {
    alert(t("popupAlert"));
    return;
  }

  const remaining = daysLeft(bookId);
  const loan = getLoanByBookId(bookId);
  const readUrl = `/api/read/${bookId}?studentId=${state.user.id}`;

  readerWindow.document.write(`
    <!DOCTYPE html>
    <html lang="${currentLang}">
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
          min-height: 58px;
          background: #5b5d91;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          padding: 14px 22px;
        }

        .topbar span {
          color: #e8ddbd;
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
          color: rgba(91, 93, 145, 0.65);
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(91, 93, 145, 0.18);
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 13px;
        }

        @media (max-width: 700px) {
          .topbar {
            align-items: flex-start;
            flex-direction: column;
          }

          iframe {
            height: calc(100vh - 88px);
          }
        }
      </style>
    </head>

    <body>
      <div class="topbar">
        <strong>${escapeHtml(book.title)}</strong>
        <span>
          ${escapeHtml(getDaysLeftText(remaining))}
          ${
            loan?.due_at
              ? ` · ${escapeHtml(t("dueDate"))}: ${escapeHtml(formatDueDate(loan.due_at))}`
              : ""
          }
          · ${escapeHtml(state.user.studentCode)}
        </span>
      </div>

      <iframe src="${readUrl}"></iframe>

      <div class="watermark">
        ZAHS Library · Student ${escapeHtml(state.user.studentCode)}
      </div>
    </body>
    </html>
  `);

  readerWindow.document.close();
}

function initRevealAnimations() {
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible-reveal");
        }
      });
    },
    { threshold: 0.12 },
  );

  observeRevealElements();
}

function observeRevealElements() {
  if (!revealObserver) return;

  const items = document.querySelectorAll(
    ".reveal:not([data-observed='true'])",
  );

  items.forEach((item) => {
    item.dataset.observed = "true";
    revealObserver.observe(item);
  });
}

function runHeaderSearch() {
  if (!headerSearch) return;

  const value = headerSearch.value.trim();

  showView("catalog");

  if (searchInput) {
    searchInput.value = value;
    renderCatalog();
  }
}

async function submitFeedback(event) {
  event.preventDefault();

  if (!feedbackStatus) return;

  feedbackStatus.className = "feedback-status";
  feedbackStatus.textContent = "";

  const name = feedbackName ? feedbackName.value.trim() : "";
  const category = feedbackCategory ? feedbackCategory.value : "";
  const rating = feedbackRating ? feedbackRating.value : "";
  const message = feedbackMessage ? feedbackMessage.value.trim() : "";

  if (!category) {
    showStatus(feedbackStatus, t("feedbackCategoryError"), "error");
    return;
  }

  if (!rating) {
    showStatus(feedbackStatus, t("feedbackRatingError"), "error");
    return;
  }

  if (message.length < 5) {
    showStatus(feedbackStatus, t("feedbackMessageError"), "error");
    return;
  }

  try {
    await apiRequest("/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        studentId: state.user ? state.user.id : null,
        name,
        category,
        rating,
        message,
      }),
    });

    feedbackForm.reset();

    showStatus(feedbackStatus, t("feedbackSuccess"), "success");

    await loadImpactStats();
  } catch (error) {
    showStatus(feedbackStatus, error.message, "error");
  }
}

async function submitBookRequest(event) {
  event.preventDefault();

  if (!requestStatus) return;

  requestStatus.className = "feedback-status";
  requestStatus.textContent = "";

  const title = requestTitle ? requestTitle.value.trim() : "";

  if (title.length < 2) {
    showStatus(requestStatus, t("requestTitleError"), "error");
    return;
  }

  try {
    await apiRequest("/api/book-requests", {
      method: "POST",
      body: JSON.stringify({
        studentId: state.user ? state.user.id : null,
        requesterName: requestName ? requestName.value.trim() : "",
        title,
        author: requestAuthor ? requestAuthor.value.trim() : "",
        language: requestLanguage ? requestLanguage.value : "",
        reason: requestReason ? requestReason.value.trim() : "",
      }),
    });

    bookRequestForm.reset();

    showStatus(requestStatus, t("requestSuccess"), "success");

    await loadImpactStats();
  } catch (error) {
    showStatus(requestStatus, error.message, "error");
  }
}

function showStatus(element, message, type) {
  element.textContent = message;
  element.classList.add(type);
}

function getStars(rating) {
  const number = Math.max(1, Math.min(5, Number(rating) || 1));

  return "★".repeat(number) + "☆".repeat(5 - number);
}

function formatFeedbackDate(dateText) {
  const date = new Date(dateText);

  if (Number.isNaN(date.getTime())) return "";

  const locale =
    currentLang === "ru" ? "ru-RU" : currentLang === "en" ? "en-US" : "az-AZ";

  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDueDate(dateText) {
  const date = new Date(dateText);

  if (Number.isNaN(date.getTime())) return "";

  const locale =
    currentLang === "ru" ? "ru-RU" : currentLang === "en" ? "en-US" : "az-AZ";

  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function loadPublicFeedbacks() {
  if (!feedbacksList) return;

  feedbacksList.innerHTML = `
    <div class="empty-state">${t("feedbacksLoading")}</div>
  `;

  try {
    const feedbacks = await apiRequest("/api/feedbacks");

    if (!feedbacks.length) {
      feedbacksList.innerHTML = `
        <div class="empty-state">${t("feedbacksEmpty")}</div>
      `;
      return;
    }

    feedbacksList.innerHTML = "";

    feedbacks.forEach((feedback) => {
      const card = document.createElement("article");

      card.className = "public-feedback-card";

      card.innerHTML = `
        <div class="public-feedback-top">
          <div class="public-feedback-name">
            ${escapeHtml(feedback.name || t("anonymousUser"))}
          </div>
          <div class="public-feedback-date">
            ${escapeHtml(formatFeedbackDate(feedback.created_at))}
          </div>
        </div>

        <div class="public-feedback-stars">
          ${escapeHtml(getStars(feedback.rating))}
        </div>

        <div class="public-feedback-category">
          ${escapeHtml(feedback.category)}
        </div>

        <p class="public-feedback-message">
          ${escapeHtml(feedback.message)}
        </p>
      `;

      feedbacksList.appendChild(card);
    });
  } catch (error) {
    feedbacksList.innerHTML = `
      <div class="empty-state">${t("feedbacksLoadError")}</div>
    `;
  }
}

function openFeedbacksModal() {
  if (!feedbacksModal) return;

  feedbacksModal.classList.remove("hidden");
  loadPublicFeedbacks();
}

document.body.addEventListener("click", (event) => {
  const target = event.target;

  const borrowButton = target.closest("[data-borrow]");
  const returnButton = target.closest("[data-return]");
  const openButton = target.closest("[data-open]");
  const infoButton = target.closest("[data-info]");
  const goButton = target.closest("[data-go]");
  const categoryCard = target.closest(".category-card");
  const loginOpenButton = target.closest("[data-login-open]");

  if (borrowButton) {
    borrowBook(borrowButton.dataset.borrow);
  }

  if (returnButton) {
    returnBook(returnButton.dataset.return);
  }

  if (openButton) {
    openReader(openButton.dataset.open);
  }

  if (infoButton) {
    showBookInfo(infoButton.dataset.info);
  }

  if (goButton) {
    showView(goButton.dataset.go);
  }

  if (loginOpenButton) {
    openLogin();
  }

  if (categoryCard) {
    const genre = categoryCard.dataset.genre;

    if (genre) {
      showView("catalog");

      if (genreSelect) {
        genreSelect.value = genre;
      }

      renderCatalog();
    }
  }
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    showView(link.dataset.view);
  });
});

[searchInput, sortSelect, languageSelect, genreSelect, accessSelect].forEach(
  (input) => {
    if (!input) return;

    input.addEventListener("input", renderCatalog);
  },
);

if (feedbackForm) {
  feedbackForm.addEventListener("submit", submitFeedback);
}

if (bookRequestForm) {
  bookRequestForm.addEventListener("submit", submitBookRequest);
}

if (openFeedbacksButton) {
  openFeedbacksButton.addEventListener("click", openFeedbacksModal);
}

if (closeFeedbacks) {
  closeFeedbacks.addEventListener("click", () => {
    feedbacksModal.classList.add("hidden");
  });
}

langButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setLanguage(button.dataset.lang);
  });
});

if (loginButton) {
  loginButton.addEventListener("click", openLogin);
}

if (logoutButton) {
  logoutButton.addEventListener("click", logoutUser);
}

if (loginHeroBtn) {
  loginHeroBtn.addEventListener("click", () => {
    if (state.user) {
      showView("catalog");
    } else {
      openLogin();
    }
  });
}

const footerLoginBtn = document.getElementById("footerLoginBtn");

if (footerLoginBtn) {
  footerLoginBtn.addEventListener("click", () => {
    if (state.user) {
      showView("shelf");
    } else {
      openLogin();
    }
  });
}

if (mobileMenuButton && mainNav) {
  mobileMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMobileMenu();
  });

  mainNav.addEventListener("click", (event) => {
    if (event.target.closest(".nav-link")) {
      closeMobileMenu();
    }
  });

  document.addEventListener("click", (event) => {
    const clickedInsideMenu = mainNav.contains(event.target);
    const clickedButton = mobileMenuButton.contains(event.target);

    if (!clickedInsideMenu && !clickedButton) {
      closeMobileMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 700) {
      closeMobileMenu();
    }
  });
}

if (headerSearchButton) {
  headerSearchButton.addEventListener("click", runHeaderSearch);
}

if (headerSearch) {
  headerSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      runHeaderSearch();
    }
  });
}

if (closeLogin) {
  closeLogin.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });
}

if (closeInfo) {
  closeInfo.addEventListener("click", () => {
    infoModal.classList.add("hidden");
  });
}

if (saveLogin) {
  saveLogin.addEventListener("click", loginUser);
}

async function init() {
  applyTranslations();
  updateLoginButton();
  initRevealAnimations();

  try {
    await loadBooks();

    if (state.user) {
      await loadLoans();
    } else {
      renderShelf();
      renderHistory();
    }

    await loadImpactStats();

    setInterval(
      async () => {
        try {
          await loadBooks();

          if (state.user) {
            await loadLoans();
          }

          await loadImpactStats();
        } catch (error) {
          console.error("Auto refresh failed:", error);
        }
      },
      60 * 60 * 1000,
    );
  } catch (error) {
    alert(t("backendAlert"));
    console.error(error);
  }
}

init();
