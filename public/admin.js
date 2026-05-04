const adminLoginCard = document.getElementById("adminLoginCard");
const adminBookCard = document.getElementById("adminBookCard");

const adminLoginForm = document.getElementById("adminLoginForm");
const adminLoginMessage = document.getElementById("adminLoginMessage");

const bookForm = document.getElementById("bookForm");
const adminMessage = document.getElementById("adminMessage");

const adminNameLabel = document.getElementById("adminNameLabel");
const adminLogoutButton = document.getElementById("adminLogoutButton");

let adminToken = localStorage.getItem("zahsAdminToken");
let adminData = JSON.parse(localStorage.getItem("zahsAdminData") || "null");

function showAdminPanel() {
  adminLoginCard.classList.add("hidden");
  adminBookCard.classList.remove("hidden");

  if (adminData) {
    adminNameLabel.textContent = `Daxil olan admin: ${adminData.name} · ${adminData.role}`;
  }
}

function showLoginPanel() {
  adminLoginCard.classList.remove("hidden");
  adminBookCard.classList.add("hidden");
}

if (adminToken && adminData) {
  showAdminPanel();
} else {
  showLoginPanel();
}

adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  adminLoginMessage.textContent = "Yoxlanılır...";
  adminLoginMessage.className = "admin-message success";

  const formData = new FormData(adminLoginForm);

  const username = formData.get("username");
  const password = formData.get("password");

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Xəta baş verdi.");
    }

    adminToken = data.token;
    adminData = data.admin;

    localStorage.setItem("zahsAdminToken", adminToken);
    localStorage.setItem("zahsAdminData", JSON.stringify(adminData));

    adminLoginForm.reset();
    showAdminPanel();
  } catch (error) {
    adminLoginMessage.textContent = error.message;
    adminLoginMessage.className = "admin-message error";
  }
});

adminLogoutButton.addEventListener("click", () => {
  localStorage.removeItem("zahsAdminToken");
  localStorage.removeItem("zahsAdminData");

  adminToken = null;
  adminData = null;

  showLoginPanel();
});

bookForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  adminMessage.textContent = "Kitab əlavə olunur...";
  adminMessage.className = "admin-message success";

  const formData = new FormData(bookForm);

  try {
    const response = await fetch("/api/admin/books", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Xəta baş verdi.");
    }

    adminMessage.textContent = `Kitab uğurla əlavə edildi. PDF: ${data.pdfPath}. Səhifə sayı: ${data.pages}`;
    adminMessage.className = "admin-message success";

    bookForm.reset();
  } catch (error) {
    adminMessage.textContent = error.message;
    adminMessage.className = "admin-message error";
  }
});
