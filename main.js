/* ==========================================================================
   SGFI — Shared site script
   No framework, no build step. Each block below guards on the presence of
   its own elements so this one file can be safely included on all 8 pages.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {
  /* ------------------------------------------------------------------ */
  /* Footer year                                                        */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ------------------------------------------------------------------ */
  /* Mobile nav toggle                                                  */
  /* ------------------------------------------------------------------ */
  var navToggle = document.getElementById("nav-toggle");
  var mobileMenu = document.getElementById("mobile-menu");

  if (navToggle && mobileMenu) {
    navToggle.addEventListener("click", function () {
      var isOpen = mobileMenu.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // Close the mobile menu after a link is chosen
    mobileMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileMenu.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Mark the current page's nav link as active (aria-current)          */
  /* ------------------------------------------------------------------ */
  var currentFile = (window.location.pathname.split("/").pop() || "index.html");
  document.querySelectorAll("[data-nav-link]").forEach(function (link) {
    var href = link.getAttribute("href");
    if (href === currentFile || (currentFile === "" && href === "index.html")) {
      link.setAttribute("aria-current", "page");
    }
  });

  /* ------------------------------------------------------------------ */
  /* Scroll-reveal for elements marked data-reveal                      */
  /* ------------------------------------------------------------------ */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if (revealEls.length) {
    if ("IntersectionObserver" in window) {
      var revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
      );
      revealEls.forEach(function (el) { revealObserver.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Home page — events gallery slider                                  */
  /* ------------------------------------------------------------------ */
  var track = document.getElementById("gallery-track");
  var prevBtn = document.getElementById("gallery-prev");
  var nextBtn = document.getElementById("gallery-next");

  if (track && prevBtn && nextBtn) {
    var slides = track.children;
    var index = 0;

    function slideWidth() {
      return slides[0] ? slides[0].getBoundingClientRect().width + 16 : 0; // + gap
    }
    function maxIndex() {
      var viewport = track.parentElement.getBoundingClientRect().width;
      var visible = Math.max(1, Math.floor(viewport / slideWidth()));
      return Math.max(0, slides.length - visible);
    }
    function update() {
      index = Math.max(0, Math.min(index, maxIndex()));
      track.style.transform = "translateX(-" + index * slideWidth() + "px)";
      prevBtn.disabled = index === 0;
      nextBtn.disabled = index >= maxIndex();
      prevBtn.classList.toggle("opacity-40", prevBtn.disabled);
      nextBtn.classList.toggle("opacity-40", nextBtn.disabled);
    }

    nextBtn.addEventListener("click", function () { index++; update(); });
    prevBtn.addEventListener("click", function () { index--; update(); });
    window.addEventListener("resize", update);
    update();
  }

  /* ------------------------------------------------------------------ */
  /* Player Record — Aadhaar search reveal (no backend, static demo)    */
  /* ------------------------------------------------------------------ */
  var recordForm = document.getElementById("record-search-form");
  var recordResult = document.getElementById("record-result");
  var recordInput = document.getElementById("aadhaar-input");
  var recordError = document.getElementById("aadhaar-error");
  var recordEmpty = document.getElementById("record-empty");

  if (recordForm && recordResult && recordInput) {
    recordForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var digitsOnly = recordInput.value.replace(/\D/g, "");

      if (digitsOnly.length !== 8) {
        recordError.classList.remove("hidden");
        recordInput.setAttribute("aria-invalid", "true");
        recordResult.classList.remove("visible");
        if (recordEmpty) recordEmpty.classList.add("hidden");
        recordInput.focus();
        return;
      }

      recordError.classList.add("hidden");
      recordInput.removeAttribute("aria-invalid");
      if (recordEmpty) recordEmpty.classList.add("hidden");

      // Static dummy record — populate the ID shown with what was searched
      var idField = document.getElementById("record-id-value");
      if (idField) idField.textContent = digitsOnly;

      recordResult.classList.add("visible");
      recordResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    recordInput.addEventListener("input", function () {
      recordError.classList.add("hidden");
      recordInput.removeAttribute("aria-invalid");
    });
  }

  var downloadBtn = document.getElementById("download-certificate");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", function () {
      window.print();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Registration form — client-side validation only, no submission     */
  /* ------------------------------------------------------------------ */
  var regForm = document.getElementById("registration-form");
  var regSuccess = document.getElementById("registration-success");

  if (regForm) {
    regForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = true;
      var firstInvalid = null;

      regForm.querySelectorAll("[data-required]").forEach(function (field) {
        var wrapper = field.closest(".field-wrapper");
        var value = field.value ? field.value.trim() : "";
        var ok = true;

        if (field.type === "checkbox") {
          ok = field.checked;
        } else if (field.type === "email") {
          ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        } else if (field.getAttribute("data-pattern") === "aadhaar") {
          ok = /^\d{12}$/.test(value.replace(/\s/g, ""));
        } else if (field.getAttribute("data-pattern") === "phone") {
          ok = /^\d{10}$/.test(value.replace(/\D/g, ""));
        } else {
          ok = value.length > 0;
        }

        if (!ok) {
          valid = false;
          if (wrapper) wrapper.classList.add("field-invalid");
          if (!firstInvalid) firstInvalid = field;
        } else if (wrapper) {
          wrapper.classList.remove("field-invalid");
        }
      });

      if (!valid) {
        if (firstInvalid) {
          firstInvalid.focus();
          firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        if (regSuccess) regSuccess.classList.add("hidden");
        return;
      }

      // No backend by design — show a confirmation state only.
      regForm.classList.add("hidden");
      if (regSuccess) {
        regSuccess.classList.remove("hidden");
        regSuccess.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    // Clear the invalid state as the visitor fixes a field
    regForm.querySelectorAll("[data-required]").forEach(function (field) {
      field.addEventListener("input", function () {
        var wrapper = field.closest(".field-wrapper");
        if (wrapper) wrapper.classList.remove("field-invalid");
      });
      field.addEventListener("change", function () {
        var wrapper = field.closest(".field-wrapper");
        if (wrapper) wrapper.classList.remove("field-invalid");
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Photo upload filename preview (registration page)                  */
  /* ------------------------------------------------------------------ */
  var photoInput = document.getElementById("photo-upload");
  var photoLabel = document.getElementById("photo-upload-filename");
  if (photoInput && photoLabel) {
    photoInput.addEventListener("change", function () {
      photoLabel.textContent = photoInput.files.length
        ? photoInput.files[0].name
        : "No file chosen";
    });
  }
});
