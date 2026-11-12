const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");

menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  menuToggle.textContent = isOpen ? "×" : "☰";
});

mainNav.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.textContent = "☰";
  });
});

const filterButtons = [...document.querySelectorAll(".filter-button")];
const artCards = [...document.querySelectorAll(".art-card")];

function filterArtwork(category) {
  filterButtons.forEach(button => {
    const active = button.dataset.filter === category;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  artCards.forEach(card => {
    card.hidden = category !== "All" && card.dataset.category !== category;
  });
}

filterButtons.forEach(button => {
  button.setAttribute("aria-pressed", String(button.classList.contains("active")));
  button.addEventListener("click", () => filterArtwork(button.dataset.filter));
});

document.querySelectorAll("[data-category-link]").forEach(link => {
  link.addEventListener("click", () => filterArtwork(link.dataset.categoryLink));
});

const artistDialog = document.querySelector("#artist-dialog");
document.querySelector("#open-submit").addEventListener("click", () => artistDialog.showModal());

const toast = document.querySelector("#toast");
let toastTimeout;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 3600);
}

document.querySelector("#artist-form").addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const name = data.get("name").trim();
  document.querySelector("#artist-message-status").textContent =
    `Thanks, ${name}! Your demo submission is ready. It has not been sent or saved.`;
  showToast("Demo only — connect a backend to receive artist applications.");
});

document.querySelector("#newsletter-form").addEventListener("submit", event => {
  event.preventDefault();
  const email = document.querySelector("#newsletter-email").value.trim();
  document.querySelector("#newsletter-message").textContent =
    `Thanks! ${email} has been entered in this demo, but not subscribed to a mailing list.`;
  showToast("Newsletter demo submitted. No email was sent or stored.");
  event.currentTarget.reset();
});

artistDialog.addEventListener("click", event => {
  if (event.target === artistDialog) artistDialog.close();
});
