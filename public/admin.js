const adminLoginCard = document.getElementById("adminLoginCard");
const adminTopBar = document.getElementById("adminTopBar");
const adminBookCard = document.getElementById("adminBookCard");
const adminAnalyticsCard = document.getElementById("adminAnalyticsCard");
const adminFeedbacksCard = document.getElementById("adminFeedbacksCard");
const adminRequestsCard = document.getElementById("adminRequestsCard");

const adminLoginForm = document.getElementById("adminLoginForm");
const adminLoginMessage = document.getElementById("adminLoginMessage");

const bookForm = document.getElementById("bookForm");
const adminMessage = document.getElementById("adminMessage");

const adminLogoutButton = document.getElementById("adminLogoutButton");
const adminNameLabel = document.getElementById("adminNameLabel");

const refreshAnalyticsButton = document.getElementById(
  "refreshAnalyticsButton",
);
const refreshFeedbacksButton = document.getElementById(
  "refreshFeedbacksButton",
);
const refreshRequestsButton = document.getElementById("refreshRequestsButton");

const adminTotalBooks = document.getElementById("adminTotalBooks");
const adminTotalStudents = document.getElementById("adminTotalStudents");
const adminTotalReadings = document.getElementById("adminTotalReadings");
const adminActiveReadings = document.getElementById("adminActiveReadings");
const adminTotalFeedbacks = document.getElementById("adminTotalFeedbacks");
const adminTotalBookRequests = document.getElementById(
  "adminTotalBookRequests",
);

const adminTopBooksList = document.getElementById("adminTopBooksList");
const adminTopGenresList = document.getElementById("adminTopGenresList");
const adminRecentFeedbacksList = document.getElementById(
  "adminRecentFeedbacksList",
);
const adminRecentBookRequestsList = document.getElementById(
  "adminRecentBookRequestsList",
);
const adminFeedbacksFullList = document.getElementById(
  "adminFeedbacksFullList",
);
const adminRequestsFullList = document.getElementById("adminRequestsFullList");

const adminLangButtons = document.querySelectorAll(".admin-lang-btn");

let adminToken = localStorage.getItem("zahsAdminToken") || "";
let adminUser = JSON.parse(localStorage.getItem("zahsAdminUser") || "null");
let currentAdminLang = localStorage.getItem("zahsAdminLang") || "az";

const adminTranslations = {
  az: {
    adminEyebrow: "Admin panel",
    adminTitle: "ZAHS Rəqəmsal Kitabxana",
    adminSubtitle:
      "Kitabları əlavə et, statistikaya bax, rəyləri və kitab istəklərini idarə et.",
    backToSite: "← Kitabxanaya qayıt",

    loginEyebrow: "Giriş",
    loginTitle: "Admin hesabına daxil ol",
    loginSubtitle:
      "Kitab əlavə etmək və statistikaya baxmaq üçün admin hesabına daxil ol.",
    usernameLabel: "Login",
    passwordLabel: "Şifrə",
    loginButton: "Daxil ol",
    logoutButton: "Çıxış",
    loggedInAs: "Daxil olan admin:",

    analyticsEyebrow: "Analytics",
    analyticsTitle: "Kitabxana statistikası",
    analyticsSubtitle:
      "Burada kitabxananın istifadəsi, oxu aktivliyi və istifadəçi reaksiyaları göstərilir.",
    refreshButton: "Yenilə",
    booksStat: "Kitab",
    studentsStat: "Şagird",
    readingsStat: "Oxu başlanıb",
    activeReadingsStat: "Aktiv oxu",
    feedbacksStat: "Rəy",
    requestsStat: "Kitab istəyi",

    topBooksTitle: "Ən çox oxunan kitablar",
    topGenresTitle: "Ən çox oxunan janrlar",
    recentFeedbacksTitle: "Son rəylər",
    recentRequestsTitle: "Son kitab istəkləri",

    addBookEyebrow: "Kitab əlavə et",
    addBookTitle: "Yeni kitab əlavə et",
    addBookSubtitle: "PDF faylını yüklə. Səhifə sayı avtomatik hesablanacaq.",
    bookTitleLabel: "Kitab adı",
    bookAuthorLabel: "Müəllif",
    bookYearLabel: "İl",
    bookLanguageLabel: "Dil",
    bookGenreLabel: "Janr",
    bookAccessLabel: "Status",
    bookNoteLabel: "Qısa təsvir",
    bookPdfLabel: "PDF faylı",
    addBookButton: "Kitabı əlavə et",

    feedbacksEyebrow: "Rəylər",
    feedbacksTitle: "İstifadəçi rəyləri",
    feedbacksSubtitle: "Sayt haqqında göndərilən rəylər burada görünür.",

    requestsEyebrow: "Kitab istəkləri",
    requestsTitle: "Təklif olunan kitablar",
    requestsSubtitle: "Şagirdlərin kitabxanada görmək istədiyi kitablar.",

    noReadingData: "Hələ oxu məlumatı yoxdur.",
    noGenreData: "Hələ janr məlumatı yoxdur.",
    noFeedbacks: "Hələ rəy yoxdur.",
    noRequests: "Hələ kitab istəyi yoxdur.",

    loginRequired: "Login və şifrə daxil et.",
    loginFailed: "Admin girişi alınmadı.",
    adminFirst: "Əvvəlcə admin kimi daxil ol.",
    bookAdded: "Kitab əlavə edildi. Səhifə sayı:",
    anonymous: "Anonim istifadəçi",
    noAuthor: "Müəllif qeyd olunmayıb",
    noLanguage: "Dil qeyd olunmayıb",
    readingsWord: "oxu",
    statusWord: "Status",
  },

  ru: {
    adminEyebrow: "Панель администратора",
    adminTitle: "ZAHS Digital Library",
    adminSubtitle:
      "Добавляй книги, смотри статистику, управляй отзывами и запросами книг.",
    backToSite: "← Вернуться к библиотеке",

    loginEyebrow: "Вход",
    loginTitle: "Войти в аккаунт администратора",
    loginSubtitle: "Войди, чтобы добавлять книги и просматривать статистику.",
    usernameLabel: "Логин",
    passwordLabel: "Пароль",
    loginButton: "Войти",
    logoutButton: "Выйти",
    loggedInAs: "Текущий админ:",

    analyticsEyebrow: "Аналитика",
    analyticsTitle: "Статистика библиотеки",
    analyticsSubtitle:
      "Здесь показаны использование библиотеки, активность чтения и реакции пользователей.",
    refreshButton: "Обновить",
    booksStat: "Книг",
    studentsStat: "Учеников",
    readingsStat: "Начатых чтений",
    activeReadingsStat: "Активных чтений",
    feedbacksStat: "Отзывов",
    requestsStat: "Запросов книг",

    topBooksTitle: "Самые читаемые книги",
    topGenresTitle: "Самые читаемые жанры",
    recentFeedbacksTitle: "Последние отзывы",
    recentRequestsTitle: "Последние запросы книг",

    addBookEyebrow: "Добавить книгу",
    addBookTitle: "Добавить новую книгу",
    addBookSubtitle:
      "Загрузи PDF-файл. Количество страниц посчитается автоматически.",
    bookTitleLabel: "Название книги",
    bookAuthorLabel: "Автор",
    bookYearLabel: "Год",
    bookLanguageLabel: "Язык",
    bookGenreLabel: "Жанр",
    bookAccessLabel: "Статус",
    bookNoteLabel: "Краткое описание",
    bookPdfLabel: "PDF-файл",
    addBookButton: "Добавить книгу",

    feedbacksEyebrow: "Отзывы",
    feedbacksTitle: "Отзывы пользователей",
    feedbacksSubtitle: "Здесь отображаются отзывы о сайте.",

    requestsEyebrow: "Запросы книг",
    requestsTitle: "Предложенные книги",
    requestsSubtitle: "Книги, которые ученики хотят видеть в библиотеке.",

    noReadingData: "Пока нет данных о чтении.",
    noGenreData: "Пока нет данных о жанрах.",
    noFeedbacks: "Пока нет отзывов.",
    noRequests: "Пока нет запросов книг.",

    loginRequired: "Введи логин и пароль.",
    loginFailed: "Не удалось войти как админ.",
    adminFirst: "Сначала войди как админ.",
    bookAdded: "Книга добавлена. Страниц:",
    anonymous: "Анонимный пользователь",
    noAuthor: "Автор не указан",
    noLanguage: "Язык не указан",
    readingsWord: "чтений",
    statusWord: "Статус",
  },

  en: {
    adminEyebrow: "Admin panel",
    adminTitle: "ZAHS Digital Library",
    adminSubtitle:
      "Add books, view statistics, and manage feedback and book requests.",
    backToSite: "← Back to library",

    loginEyebrow: "Login",
    loginTitle: "Log in to admin account",
    loginSubtitle: "Log in to add books and view statistics.",
    usernameLabel: "Username",
    passwordLabel: "Password",
    loginButton: "Log in",
    logoutButton: "Log out",
    loggedInAs: "Logged in as:",

    analyticsEyebrow: "Analytics",
    analyticsTitle: "Library statistics",
    analyticsSubtitle:
      "This shows library usage, reading activity, and user responses.",
    refreshButton: "Refresh",
    booksStat: "Books",
    studentsStat: "Students",
    readingsStat: "Readings started",
    activeReadingsStat: "Active readings",
    feedbacksStat: "Feedbacks",
    requestsStat: "Book requests",

    topBooksTitle: "Most read books",
    topGenresTitle: "Most read genres",
    recentFeedbacksTitle: "Recent feedback",
    recentRequestsTitle: "Recent book requests",

    addBookEyebrow: "Add book",
    addBookTitle: "Add a new book",
    addBookSubtitle:
      "Upload a PDF file. The page count will be calculated automatically.",
    bookTitleLabel: "Book title",
    bookAuthorLabel: "Author",
    bookYearLabel: "Year",
    bookLanguageLabel: "Language",
    bookGenreLabel: "Genre",
    bookAccessLabel: "Status",
    bookNoteLabel: "Short description",
    bookPdfLabel: "PDF file",
    addBookButton: "Add book",

    feedbacksEyebrow: "Feedback",
    feedbacksTitle: "User feedback",
    feedbacksSubtitle: "Feedback about the site appears here.",

    requestsEyebrow: "Book requests",
    requestsTitle: "Suggested books",
    requestsSubtitle: "Books students want to see in the library.",

    noReadingData: "No reading data yet.",
    noGenreData: "No genre data yet.",
    noFeedbacks: "No feedback yet.",
    noRequests: "No book requests yet.",

    loginRequired: "Enter username and password.",
    loginFailed: "Admin login failed.",
    adminFirst: "Log in as admin first.",
    bookAdded: "Book added. Page count:",
    anonymous: "Anonymous user",
    noAuthor: "Author not provided",
    noLanguage: "Language not provided",
    readingsWord: "readings",
    statusWord: "Status",
  },
};

function ta(key) {
  return (
    adminTranslations[currentAdminLang]?.[key] ||
    adminTranslations.az[key] ||
    key
  );
}

function applyAdminTranslations() {
  document.documentElement.lang = currentAdminLang;
  document.documentElement.dataset.langTheme = currentAdminLang;

  document.querySelectorAll("[data-admin-i18n]").forEach((element) => {
    const key = element.dataset.adminI18n;
    element.textContent = ta(key);
  });

  adminLangButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.adminLang === currentAdminLang,
    );
  });
}

function setAdminLanguage(lang) {
  if (!adminTranslations[lang]) return;

  currentAdminLang = lang;
  localStorage.setItem("zahsAdminLang", lang);
  applyAdminTranslations();

  if (adminToken && adminUser) {
    loadAdminAnalytics();
    loadAdminFeedbacks();
    loadAdminBookRequests();
  }
}

function saveAdminSession(token, admin) {
  adminToken = token;
  adminUser = admin;

  localStorage.setItem("zahsAdminToken", token);
  localStorage.setItem("zahsAdminUser", JSON.stringify(admin));
}

function clearAdminSession() {
  adminToken = "";
  adminUser = null;

  localStorage.removeItem("zahsAdminToken");
  localStorage.removeItem("zahsAdminUser");
}

function showMessage(element, text, type) {
  if (!element) return;
  element.textContent = text;
  element.className = `admin-message ${type}`;
}

function clearMessage(element) {
  if (!element) return;
  element.textContent = "";
  element.className = "admin-message";
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateText) {
  const date = new Date(dateText);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const locale =
    currentAdminLang === "ru"
      ? "ru-RU"
      : currentAdminLang === "en"
        ? "en-US"
        : "az-AZ";

  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function adminRequest(url, options = {}) {
  const headers = {
    Authorization: `Bearer ${adminToken}`,
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
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

function showLoginPanel() {
  adminLoginCard?.classList.remove("hidden");
  adminTopBar?.classList.add("hidden");
  adminBookCard?.classList.add("hidden");
  adminAnalyticsCard?.classList.add("hidden");
  adminFeedbacksCard?.classList.add("hidden");
  adminRequestsCard?.classList.add("hidden");
}

function showAdminPanel() {
  adminLoginCard?.classList.add("hidden");
  adminTopBar?.classList.remove("hidden");
  adminBookCard?.classList.remove("hidden");
  adminAnalyticsCard?.classList.remove("hidden");
  adminFeedbacksCard?.classList.remove("hidden");
  adminRequestsCard?.classList.remove("hidden");

  if (adminNameLabel && adminUser) {
    adminNameLabel.textContent = `${adminUser.name} · ${adminUser.role}`;
  }

  loadAdminAnalytics();
  loadAdminFeedbacks();
  loadAdminBookRequests();
}

async function loginAdmin(event) {
  event.preventDefault();
  clearMessage(adminLoginMessage);

  const formData = new FormData(adminLoginForm);
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "").trim();

  if (!username || !password) {
    showMessage(adminLoginMessage, ta("loginRequired"), "error");
    return;
  }

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || ta("loginFailed"));
    }

    saveAdminSession(result.token, result.admin);
    adminLoginForm.reset();
    showAdminPanel();
  } catch (error) {
    showMessage(adminLoginMessage, error.message, "error");
  }
}

function logoutAdmin() {
  clearAdminSession();
  showLoginPanel();
}

async function addBook(event) {
  event.preventDefault();
  clearMessage(adminMessage);

  if (!adminToken) {
    showMessage(adminMessage, ta("adminFirst"), "error");
    showLoginPanel();
    return;
  }

  const formData = new FormData(bookForm);

  try {
    const result = await adminRequest("/api/admin/books", {
      method: "POST",
      body: formData,
    });

    showMessage(adminMessage, `${ta("bookAdded")} ${result.pages}`, "success");
    bookForm.reset();

    loadAdminAnalytics();
  } catch (error) {
    showMessage(adminMessage, error.message, "error");
  }
}

function renderDataList(container, items, renderItem, emptyText) {
  if (!container) return;

  if (!items || !items.length) {
    container.innerHTML = `<div class="admin-empty">${emptyText}</div>`;
    return;
  }

  container.innerHTML = "";

  items.forEach((item) => {
    const element = document.createElement("article");
    element.className = "admin-data-item";
    element.innerHTML = renderItem(item);
    container.appendChild(element);
  });
}

async function loadAdminAnalytics() {
  if (!adminToken) return;

  try {
    const data = await adminRequest("/api/admin/analytics");

    if (adminTotalBooks) adminTotalBooks.textContent = data.totals.books ?? 0;
    if (adminTotalStudents)
      adminTotalStudents.textContent = data.totals.students ?? 0;
    if (adminTotalReadings)
      adminTotalReadings.textContent = data.totals.readings ?? 0;
    if (adminActiveReadings)
      adminActiveReadings.textContent = data.totals.activeReadings ?? 0;
    if (adminTotalFeedbacks)
      adminTotalFeedbacks.textContent = data.totals.feedbacks ?? 0;
    if (adminTotalBookRequests) {
      adminTotalBookRequests.textContent = data.totals.bookRequests ?? 0;
    }

    renderDataList(
      adminTopBooksList,
      data.topBooks,
      (book) => `
        <strong>${escapeHtml(book.title)}</strong>
        <span>${escapeHtml(book.author)} · ${escapeHtml(book.language)}</span>
        <span>${book.borrow_count} ${ta("readingsWord")}</span>
      `,
      ta("noReadingData"),
    );

    renderDataList(
      adminTopGenresList,
      data.topGenres,
      (genre) => `
        <strong>${escapeHtml(genre.genre)}</strong>
        <span>${genre.borrow_count} ${ta("readingsWord")}</span>
      `,
      ta("noGenreData"),
    );

    renderDataList(
      adminRecentFeedbacksList,
      data.recentFeedbacks,
      (feedback) => `
        <strong>${escapeHtml(feedback.name || ta("anonymous"))}</strong>
        <span>${escapeHtml(feedback.category)} · ${feedback.rating}/5 · ${formatDate(
          feedback.created_at,
        )}</span>
        <p>${escapeHtml(feedback.message)}</p>
      `,
      ta("noFeedbacks"),
    );

    renderDataList(
      adminRecentBookRequestsList,
      data.recentBookRequests,
      (request) => `
        <strong>${escapeHtml(request.title)}</strong>
        <span>${escapeHtml(request.author || ta("noAuthor"))} · ${escapeHtml(
          request.language || ta("noLanguage"),
        )}</span>
        <span>${ta("statusWord")}: ${escapeHtml(request.status || "new")} · ${formatDate(
          request.created_at,
        )}</span>
        <p>${escapeHtml(request.reason || "")}</p>
      `,
      ta("noRequests"),
    );
  } catch (error) {
    console.error(error);

    if (error.message.includes("Admin")) {
      clearAdminSession();
      showLoginPanel();
    }
  }
}

async function loadAdminFeedbacks() {
  if (!adminToken || !adminFeedbacksFullList) return;

  try {
    const feedbacks = await adminRequest("/api/admin/feedbacks");

    renderDataList(
      adminFeedbacksFullList,
      feedbacks,
      (feedback) => `
        <strong>${escapeHtml(
          feedback.name ||
            [feedback.student_name, feedback.student_surname]
              .filter(Boolean)
              .join(" ") ||
            ta("anonymous"),
        )}</strong>
        <span>${escapeHtml(feedback.category)} · ${feedback.rating}/5 · ${formatDate(
          feedback.created_at,
        )}</span>
        <p>${escapeHtml(feedback.message)}</p>
        <span class="admin-status">${escapeHtml(feedback.status || "new")}</span>
      `,
      ta("noFeedbacks"),
    );
  } catch (error) {
    console.error(error);
  }
}

async function loadAdminBookRequests() {
  if (!adminToken || !adminRequestsFullList) return;

  try {
    const requests = await adminRequest("/api/admin/book-requests");

    renderDataList(
      adminRequestsFullList,
      requests,
      (request) => `
        <strong>${escapeHtml(request.title)}</strong>
        <span>${escapeHtml(request.author || ta("noAuthor"))} · ${escapeHtml(
          request.language || ta("noLanguage"),
        )}</span>
        <span>${escapeHtml(request.name || ta("anonymous"))} · ${formatDate(request.created_at)}</span>
        <p>${escapeHtml(request.reason || "")}</p>
        <span class="admin-status">${ta("statusWord")}: ${escapeHtml(request.status || "new")}</span>
      `,
      ta("noRequests"),
    );
  } catch (error) {
    console.error(error);
  }
}

adminLoginForm?.addEventListener("submit", loginAdmin);
bookForm?.addEventListener("submit", addBook);
adminLogoutButton?.addEventListener("click", logoutAdmin);

refreshAnalyticsButton?.addEventListener("click", loadAdminAnalytics);
refreshFeedbacksButton?.addEventListener("click", loadAdminFeedbacks);
refreshRequestsButton?.addEventListener("click", loadAdminBookRequests);

adminLangButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setAdminLanguage(button.dataset.adminLang);
  });
});

applyAdminTranslations();

if (adminToken && adminUser) {
  showAdminPanel();
} else {
  showLoginPanel();
}
