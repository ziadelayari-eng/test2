// ============================================================
// Books Explorer - Main Application JavaScript
// Uses Open Library API | localStorage for Auth & Favorites
// ============================================================

"use strict";

// ===== DOM Elements =====
const booksGrid = document.getElementById("booksGrid");
const favoritesGrid = document.getElementById("favoritesGrid");
const favoritesEmpty = document.getElementById("favoritesEmpty");
const loadingSpinner = document.getElementById("loadingSpinner");
const errorMessage = document.getElementById("errorMessage");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchType = document.getElementById("searchType");
const genreButtons = document.querySelectorAll(".genre-btn");

// Auth elements
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authButtons = document.getElementById("authButtons");
const userInfo = document.getElementById("userInfo");
const userNameSpan = document.getElementById("userName");
const logoutBtn = document.getElementById("logoutBtn");

// Detail modal elements
const bookDetailModal = document.getElementById("bookDetailModal");
const detailCover = document.getElementById("detailCover");
const detailTitle = document.getElementById("detailTitle");
const detailAuthor = document.getElementById("detailAuthor");
const detailYear = document.getElementById("detailYear");
const detailSubjects = document.getElementById("detailSubjects");
const detailFavBtn = document.getElementById("detailFavBtn");

// ===== API URLs =====
const API_BASE = "https://openlibrary.org";
const COVER_BASE = "https://covers.openlibrary.org/b/id/";

// ===== State =====
let currentDetailBook = null;

// ============================================================
// 1. UTILITY FUNCTIONS
// ============================================================

function showLoading() {
    loadingSpinner.classList.remove("d-none");
    errorMessage.classList.add("d-none");
}

function hideLoading() {
    loadingSpinner.classList.add("d-none");
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.remove("d-none");
    hideLoading();
}

function hideError() {
    errorMessage.classList.add("d-none");
}

function getCoverUrl(coverId, size = "M") {
    if (coverId) {
        return `${COVER_BASE}${coverId}-${size}.jpg`;
    }
    return null;
}

// ============================================================
// 2. FAVORITES (localStorage)
// ============================================================

function getFavorites() {
    try {
        const data = localStorage.getItem("booksFavorites");
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Error reading favorites:", e);
        return [];
    }
}

function saveFavorites(favorites) {
    try {
        localStorage.setItem("booksFavorites", JSON.stringify(favorites));
    } catch (e) {
        console.error("Error saving favorites:", e);
    }
}

function isFavorite(bookKey) {
    const favorites = getFavorites();
    return favorites.some((fav) => fav.key === bookKey);
}

function toggleFavorite(book) {
    let favorites = getFavorites();
    const index = favorites.findIndex((fav) => fav.key === book.key);

    if (index > -1) {
        // Remove from favorites
        favorites.splice(index, 1);
    } else {
        // Add to favorites
        favorites.push(book);
    }

    saveFavorites(favorites);
    renderFavorites();
    updateFavButtons(book.key);
}

function updateFavButtons(bookKey) {
    // Update all fav buttons in the books grid
    document.querySelectorAll(`.fav-btn[data-key="${bookKey}"]`).forEach((btn) => {
        if (isFavorite(bookKey)) {
            btn.classList.add("active");
            btn.innerHTML = '<i class="bi bi-heart-fill"></i>';
        } else {
            btn.classList.remove("active");
            btn.innerHTML = '<i class="bi bi-heart"></i>';
        }
    });

    // Update detail modal fav button if open for this book
    if (currentDetailBook && currentDetailBook.key === bookKey) {
        updateDetailFavButton();
    }
}

function updateDetailFavButton() {
    if (!currentDetailBook) return;
    if (isFavorite(currentDetailBook.key)) {
        detailFavBtn.innerHTML = '<i class="bi bi-heart-fill me-1"></i>Remove from Favorites';
        detailFavBtn.classList.remove("btn-outline-success");
        detailFavBtn.classList.add("btn-danger");
    } else {
        detailFavBtn.innerHTML = '<i class="bi bi-heart me-1"></i>Add to Favorites';
        detailFavBtn.classList.remove("btn-danger");
        detailFavBtn.classList.add("btn-outline-success");
    }
}

// ============================================================
// 3. RENDER BOOK CARDS
// ============================================================

function createBookCard(book) {
    const col = document.createElement("div");
    col.className = "col-6 col-md-4 col-lg-3";

    const coverUrl = getCoverUrl(book.coverId, "M");
    const favActive = isFavorite(book.key) ? "active" : "";
    const favIcon = isFavorite(book.key) ? "bi-heart-fill" : "bi-heart";

    col.innerHTML = `
        <div class="card book-card shadow-sm">
            <div class="card-img-wrapper" data-key="${book.key}">
                ${
                    coverUrl
                        ? `<img src="${coverUrl}" alt="${book.title}" loading="lazy">`
                        : `<i class="bi bi-book no-cover"></i>`
                }
            </div>
            <div class="card-body d-flex flex-column">
                <h6 class="card-title">${book.title}</h6>
                <p class="card-text mb-1"><i class="bi bi-person-fill me-1 text-success"></i>${book.author || "Unknown"}</p>
                <p class="card-text mb-2"><i class="bi bi-calendar-fill me-1 text-success"></i>${book.year || "N/A"}</p>
                <div class="d-flex justify-content-between align-items-center mt-auto">
                    <button class="btn btn-sm btn-outline-success view-details-btn" data-key="${book.key}">Details</button>
                    <button class="fav-btn ${favActive}" data-key="${book.key}" title="Toggle Favorite">
                        <i class="bi ${favIcon}"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Click on image opens detail
    col.querySelector(".card-img-wrapper").addEventListener("click", () => {
        openBookDetail(book);
    });

    // Details button
    col.querySelector(".view-details-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        openBookDetail(book);
    });

    // Favorite button
    col.querySelector(".fav-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(book);
    });

    return col;
}

function renderBooks(books) {
    booksGrid.innerHTML = "";

    if (books.length === 0) {
        booksGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-emoji-frown text-muted" style="font-size: 3rem;"></i>
                <p class="text-muted mt-2">No books found. Try a different search.</p>
            </div>
        `;
        return;
    }

    books.forEach((book) => {
        booksGrid.appendChild(createBookCard(book));
    });
}

function renderFavorites() {
    const favorites = getFavorites();
    favoritesGrid.innerHTML = "";

    if (favorites.length === 0) {
        favoritesEmpty.classList.remove("d-none");
        return;
    }

    favoritesEmpty.classList.add("d-none");

    favorites.forEach((book) => {
        const col = document.createElement("div");
        col.className = "col-6 col-md-4 col-lg-3";

        const coverUrl = getCoverUrl(book.coverId, "M");

        col.innerHTML = `
            <div class="card book-card shadow-sm">
                <div class="card-img-wrapper" data-key="${book.key}">
                    ${
                        coverUrl
                            ? `<img src="${coverUrl}" alt="${book.title}" loading="lazy">`
                            : `<i class="bi bi-book no-cover"></i>`
                    }
                </div>
                <div class="card-body d-flex flex-column">
                    <h6 class="card-title">${book.title}</h6>
                    <p class="card-text mb-1"><i class="bi bi-person-fill me-1 text-success"></i>${book.author || "Unknown"}</p>
                    <p class="card-text mb-2"><i class="bi bi-calendar-fill me-1 text-success"></i>${book.year || "N/A"}</p>
                    <div class="d-flex justify-content-between align-items-center mt-auto">
                        <button class="btn btn-sm btn-outline-success view-details-btn" data-key="${book.key}">Details</button>
                        <button class="fav-btn active" data-key="${book.key}" title="Remove from Favorites">
                            <i class="bi bi-heart-fill"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        col.querySelector(".card-img-wrapper").addEventListener("click", () => {
            openBookDetail(book);
        });

        col.querySelector(".view-details-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            openBookDetail(book);
        });

        col.querySelector(".fav-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            toggleFavorite(book);
        });

        favoritesGrid.appendChild(col);
    });
}

// ============================================================
// 4. BOOK DETAILS MODAL
// ============================================================

function openBookDetail(book) {
    currentDetailBook = book;

    const coverUrl = getCoverUrl(book.coverId, "L");
    detailCover.src = coverUrl || "";
    detailCover.alt = book.title;

    if (!coverUrl) {
        detailCover.style.display = "none";
    } else {
        detailCover.style.display = "block";
    }

    detailTitle.textContent = book.title;
    detailAuthor.textContent = book.author || "Unknown Author";
    detailYear.textContent = book.year || "N/A";
    detailSubjects.textContent = book.subjects
        ? book.subjects.slice(0, 5).join(", ")
        : "N/A";

    document.getElementById("bookDetailModalLabel").textContent = book.title;

    updateDetailFavButton();

    const modal = new bootstrap.Modal(bookDetailModal);
    modal.show();
}

// Detail modal favorite button
detailFavBtn.addEventListener("click", () => {
    if (currentDetailBook) {
        toggleFavorite(currentDetailBook);
    }
});

// ============================================================
// 5. FETCH BOOKS FROM API
// ============================================================

// Normalize search results into a uniform book object
function normalizeSearchResult(doc) {
    return {
        key: doc.key || `book-${Math.random().toString(36).substr(2, 9)}`,
        title: doc.title || "Untitled",
        author: doc.author_name ? doc.author_name[0] : "Unknown",
        year: doc.first_publish_year || null,
        coverId: doc.cover_i || null,
        subjects: doc.subject ? doc.subject.slice(0, 10) : [],
    };
}

// Normalize subject endpoint results
function normalizeSubjectResult(work) {
    return {
        key: work.key || `book-${Math.random().toString(36).substr(2, 9)}`,
        title: work.title || "Untitled",
        author: work.authors ? work.authors.map((a) => a.name).join(", ") : "Unknown",
        year: work.first_publish_year || null,
        coverId: work.cover_id || null,
        subjects: work.subject ? work.subject.slice(0, 10) : [],
    };
}

// Search books by title or author
async function searchBooks(query, type = "title") {
    try {
        showLoading();
        hideError();
        booksGrid.innerHTML = "";

        const url = `${API_BASE}/search.json?${type}=${encodeURIComponent(query)}&limit=20`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        const books = data.docs.map(normalizeSearchResult);

        hideLoading();
        renderBooks(books);
    } catch (error) {
        console.error("Search error:", error);
        showError("Failed to fetch books. Please check your connection and try again.");
    }
}

// Get books by subject/genre
async function getBooksBySubject(subject) {
    try {
        showLoading();
        hideError();
        booksGrid.innerHTML = "";

        const url = `${API_BASE}/subjects/${encodeURIComponent(subject)}.json?limit=20`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        const books = data.works.map(normalizeSubjectResult);

        hideLoading();
        renderBooks(books);
    } catch (error) {
        console.error("Subject fetch error:", error);
        showError("Failed to fetch books for this genre. Please try again.");
    }
}

// ============================================================
// 6. SEARCH FORM HANDLER
// ============================================================

searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    const type = searchType.value;

    if (query.length < 1) return;

    // Reset active genre buttons
    genreButtons.forEach((btn) => btn.classList.remove("active"));

    searchBooks(query, type);
});

// ============================================================
// 7. GENRE / SUBJECT FILTER
// ============================================================

genreButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        // Toggle active state
        genreButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        // Clear search input
        searchInput.value = "";

        const subject = btn.getAttribute("data-subject");
        getBooksBySubject(subject);
    });
});

// ============================================================
// 8. AUTH - LOGIN & REGISTER (localStorage)
// ============================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// --- Register ---
registerForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // Clear previous messages
    hideAlert("registerSuccess");
    hideAlert("registerError");
    clearValidation(registerForm);

    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const confirmPassword = document.getElementById("regConfirmPassword").value;

    let isValid = true;

    // Validate name
    if (!name) {
        showFieldError("regName", "regNameError", "Name is required.");
        isValid = false;
    }

    // Validate email
    if (!EMAIL_REGEX.test(email)) {
        showFieldError("regEmail", "regEmailError", "Please enter a valid email address.");
        isValid = false;
    }

    // Validate password (min 8 chars)
    if (password.length < 8) {
        showFieldError("regPassword", "regPasswordError", "Password must be at least 8 characters.");
        isValid = false;
    }

    // Validate confirm password
    if (password !== confirmPassword) {
        showFieldError("regConfirmPassword", "regConfirmError", "Passwords do not match.");
        isValid = false;
    }

    if (!isValid) return;

    try {
        // Check if user already exists
        const users = getUsers();
        if (users.find((u) => u.email === email)) {
            showAlert("registerError", "An account with this email already exists.");
            return;
        }

        // Store user (Base64 encode password — NOT secure for production)
        users.push({
            name: name,
            email: email,
            password: btoa(password),
        });

        localStorage.setItem("booksUsers", JSON.stringify(users));

        showAlert("registerSuccess", "Registration successful! You can now login.");
        registerForm.reset();

        // Auto-close after 2 seconds
        setTimeout(() => {
            bootstrap.Modal.getInstance(document.getElementById("registerModal")).hide();
            hideAlert("registerSuccess");
        }, 2000);
    } catch (error) {
        console.error("Registration error:", error);
        showAlert("registerError", "Registration failed. Please try again.");
    }
});

// --- Login ---
loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    hideAlert("loginSuccess");
    hideAlert("loginError");
    clearValidation(loginForm);

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    let isValid = true;

    if (!EMAIL_REGEX.test(email)) {
        showFieldError("loginEmail", "loginEmailError", "Please enter a valid email.");
        isValid = false;
    }

    if (!password) {
        showFieldError("loginPassword", "loginPasswordError", "Password is required.");
        isValid = false;
    }

    if (!isValid) return;

    try {
        const users = getUsers();
        const user = users.find((u) => u.email === email && atob(u.password) === password);

        if (!user) {
            showAlert("loginError", "Invalid email or password.");
            return;
        }

        // Set logged in user
        localStorage.setItem("booksCurrentUser", JSON.stringify({ name: user.name, email: user.email }));

        showAlert("loginSuccess", `Welcome back, ${user.name}!`);
        loginForm.reset();

        setTimeout(() => {
            bootstrap.Modal.getInstance(document.getElementById("loginModal")).hide();
            hideAlert("loginSuccess");
            updateAuthUI();
        }, 1500);
    } catch (error) {
        console.error("Login error:", error);
        showAlert("loginError", "Login failed. Please try again.");
    }
});

// --- Logout ---
logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("booksCurrentUser");
    updateAuthUI();
});

// --- Auth Helpers ---
function getUsers() {
    try {
        const data = localStorage.getItem("booksUsers");
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

function getCurrentUser() {
    try {
        const data = localStorage.getItem("booksCurrentUser");
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}

function updateAuthUI() {
    const user = getCurrentUser();
    if (user) {
        authButtons.classList.add("d-none");
        userInfo.classList.remove("d-none");
        userNameSpan.textContent = user.name;
    } else {
        authButtons.classList.remove("d-none");
        userInfo.classList.add("d-none");
        userNameSpan.textContent = "";
    }
}

// --- Validation Helpers ---
function showFieldError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    input.classList.add("is-invalid");
    error.textContent = message;
}

function clearValidation(form) {
    form.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
}

function showAlert(id, message) {
    const el = document.getElementById(id);
    el.textContent = message;
    el.classList.remove("d-none");
}

function hideAlert(id) {
    const el = document.getElementById(id);
    el.classList.add("d-none");
    el.textContent = "";
}

// ============================================================
// 9. ACTIVE NAV LINK ON SCROLL
// ============================================================

window.addEventListener("scroll", () => {
    const sections = document.querySelectorAll("section[id]");
    const scrollPos = window.scrollY + 100;

    sections.forEach((section) => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute("id");

        if (scrollPos >= top && scrollPos < top + height) {
            document.querySelectorAll(".nav-link").forEach((link) => {
                link.classList.remove("active");
                if (link.getAttribute("href") === `#${id}`) {
                    link.classList.add("active");
                }
            });
        }
    });
});

// ============================================================
// 10. INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    // Update auth UI
    updateAuthUI();

    // Render favorites
    renderFavorites();

    // Load default books (trending/fantasy)
    getBooksBySubject("fantasy");
});
