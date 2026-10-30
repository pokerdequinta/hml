const pages = document.querySelectorAll(".page");
const navigationButtons = document.querySelectorAll("[data-page]");

const sideMenu = document.getElementById("side-menu");
const menuOverlay = document.getElementById("menu-overlay");
const openMenuButton = document.getElementById("open-menu");
const closeMenuButton = document.getElementById("close-menu");

const toast = document.getElementById("toast");

function openMenu() {
  sideMenu.classList.add("open");
  menuOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeMenu() {
  sideMenu.classList.remove("open");
  menuOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function showPage(pageName) {
  const targetPage = document.getElementById(`page-${pageName}`);

  if (!targetPage) {
    showToast("Esta seção estará disponível em breve.");
    closeMenu();
    return;
  }

  pages.forEach((page) => {
    page.classList.remove("active");
  });

  targetPage.classList.add("active");

  document.querySelectorAll(".bottom-link").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageName
    );
  });

  closeMenu();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

navigationButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();

    const pageName = button.dataset.page;

    if (pageName) {
      showPage(pageName);
    }
  });
});

openMenuButton.addEventListener("click", openMenu);
closeMenuButton.addEventListener("click", closeMenu);
menuOverlay.addEventListener("click", closeMenu);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
  }
});

// CARROSSEL

const carouselTrack = document.getElementById("carousel-track");
const carouselCards = document.querySelectorAll(".stage-card");
const carouselDots = document.querySelectorAll(".dot");
const previousSlideButton = document.getElementById("previous-slide");
const nextSlideButton = document.getElementById("next-slide");

let currentSlide = 0;
let carouselTimer;

function updateCarousel() {
  carouselTrack.style.transform = `translateX(-${currentSlide * 100}%)`;

  carouselDots.forEach((dot, index) => {
    dot.classList.toggle("active", index === currentSlide);
  });
}

function goToSlide(index) {
  if (index < 0) {
    currentSlide = carouselCards.length - 1;
  } else if (index >= carouselCards.length) {
    currentSlide = 0;
  } else {
    currentSlide = index;
  }

  updateCarousel();
  restartCarouselTimer();
}

function restartCarouselTimer() {
  window.clearInterval(carouselTimer);

  carouselTimer = window.setInterval(() => {
    goToSlide(currentSlide + 1);
  }, 6000);
}

previousSlideButton.addEventListener("click", () => {
  goToSlide(currentSlide - 1);
});

nextSlideButton.addEventListener("click", () => {
  goToSlide(currentSlide + 1);
});

carouselDots.forEach((dot) => {
  dot.addEventListener("click", () => {
    goToSlide(Number(dot.dataset.slide));
  });
});

let touchStartX = 0;
let touchEndX = 0;

carouselTrack.addEventListener(
  "touchstart",
  (event) => {
    touchStartX = event.changedTouches[0].screenX;
  },
  { passive: true }
);

carouselTrack.addEventListener(
  "touchend",
  (event) => {
    touchEndX = event.changedTouches[0].screenX;

    const distance = touchStartX - touchEndX;

    if (Math.abs(distance) < 50) {
      return;
    }

    if (distance > 0) {
      goToSlide(currentSlide + 1);
    } else {
      goToSlide(currentSlide - 1);
    }
  },
  { passive: true }
);

updateCarousel();
restartCarouselTimer();

// SERVICE WORKER

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch((error) => {
        console.error("Erro ao registrar o Service Worker:", error);
      });
  });
}
