(function () {
  const TOTAL_STEPS = 4;
  const stepMeta = {
    1: { label: "Step 1 of 4: Student's Details", pct: 25 },
    2: { label: "Step 2 of 4: Verify Details", pct: 50 },
    3: { label: "Step 3 of 4: Payment Info", pct: 75 },
    4: { label: "Step 4 of 4: Status", pct: 100 },
  };

  const screens = {
    1: document.getElementById("screen-details"),
    2: document.getElementById("screen-verify"),
    3: document.getElementById("screen-bank"),
    4: document.getElementById("screen-status"),
  };

  const navItems = {
    1: document.getElementById("nav-details"),
    2: document.getElementById("nav-verify"),
    3: document.getElementById("nav-bank"),
    4: document.getElementById("nav-status"),
  };

  const stepLabel = document.getElementById("stepLabel");
  const stepPct = document.getElementById("stepPct");
  const progressFill = document.getElementById("progressFill");
  const appContent = document.getElementById("appContent");

  // Tracks the furthest step the user has legitimately reached,
  // so the bottom nav only allows jumping to completed/current steps.
  let furthestStep = 1;
  let currentStep = 1;

  // Fixed fee lines (in a real app these would come from a school's fee schedule).
  const FEES = {
    tuitionBase: 4500,
    facilityFee: 250,
    transactionFee: 15,
  };

  function formatMoney(n) {
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function goToStep(step) {
    if (step < 1 || step > TOTAL_STEPS) return;
    if (step > furthestStep) return; // can't skip ahead past what's been completed

    currentStep = step;
    Object.keys(screens).forEach((key) => {
      screens[key].classList.toggle("hidden", Number(key) !== step);
    });
    Object.keys(navItems).forEach((key) => {
      navItems[key].classList.toggle("active", Number(key) === step);
    });

    stepLabel.textContent = stepMeta[step].label;
    stepPct.textContent = stepMeta[step].pct + "% Complete";
    progressFill.style.width = stepMeta[step].pct + "%";

    appContent.scrollTop = 0;
  }

  function advanceTo(step) {
    if (step > furthestStep) furthestStep = step;
    goToStep(step);
  }

  // --- Step 1 -> Step 2 data sync ---
  function getSelectedPurpose() {
    const checked = document.querySelector('input[name="purpose"]:checked');
    return checked ? checked.value : "—";
  }

  function syncVerifyScreen() {
    const name = document.getElementById("studentName").value.trim();
    const id = document.getElementById("studentId").value.trim();
    const grade = document.getElementById("gradeSelect").value;
    const purpose = getSelectedPurpose();

    document.getElementById("sumName").textContent = name || "—";
    document.getElementById("sumId").textContent = id || "—";
    document.getElementById("sumGrade").textContent = grade || "—";
    document.getElementById("sumPurpose").textContent = purpose;

    // Field trips / extracurriculars don't carry the facility fee in this example.
    const tuition = FEES.tuitionBase;
    const facility = purpose === "Tuition Fees" ? FEES.facilityFee : 0;
    const total = tuition + facility;

    document.getElementById("brTuition").textContent = formatMoney(tuition);
    document.getElementById("brFacility").textContent = formatMoney(facility);
    document.getElementById("brTotal").textContent = formatMoney(total);
  }

  function syncFinalTotal() {
    const purpose = getSelectedPurpose();
    const tuition = FEES.tuitionBase;
    const facility = purpose === "Tuition Fees" ? FEES.facilityFee : 0;
    const total = tuition + facility + FEES.transactionFee;
    document.getElementById("finalTotal").textContent = formatMoney(total);
    return total;
  }

  function syncStatusScreen() {
    const name = document.getElementById("studentName").value.trim() || "—";
    const total = syncFinalTotal();
    document.getElementById("statusName").textContent = name;
    document.getElementById("statusAmount").textContent = formatMoney(total);
    document.getElementById("statusRef").textContent =
      "PMT-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  // --- Basic validation helpers ---
  function requireFields(ids) {
    let ok = true;
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el.value || !el.value.trim()) {
        el.style.borderColor = "#e0473a";
        ok = false;
      } else {
        el.style.borderColor = "transparent";
      }
    });
    return ok;
  }

  // --- Button wiring ---
  document.getElementById("toVerifyBtn").addEventListener("click", () => {
    if (!requireFields(["studentName", "studentId", "gradeSelect"])) return;
    syncVerifyScreen();
    advanceTo(2);
  });

  document.getElementById("editDetailsBtn").addEventListener("click", () => {
    goToStep(1);
  });

  document.getElementById("toBankBtn").addEventListener("click", () => {
    syncFinalTotal();
    advanceTo(3);
  });

  document.getElementById("toStatusBtn").addEventListener("click", () => {
    if (!requireFields(["payerName", "payerPhone", "payerEmail"])) return;
    syncStatusScreen();
    advanceTo(4);
  });

  document.getElementById("startOverBtn").addEventListener("click", () => {
    document.getElementById("studentName").value = "";
    document.getElementById("studentId").value = "";
    document.getElementById("gradeSelect").selectedIndex = 0;
    document.getElementById("payerName").value = "";
    document.getElementById("payerPhone").value = "";
    document.getElementById("payerEmail").value = "";
    document.querySelector('input[name="purpose"]').checked = true;
    furthestStep = 1;
    advanceTo(1);
  });

  document.getElementById("backBtn").addEventListener("click", () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  });

  // Bottom nav
  Object.keys(navItems).forEach((key) => {
    navItems[key].addEventListener("click", () => goToStep(Number(key)));
  });

  // Copy account number
  document.getElementById("copyAccountBtn").addEventListener("click", () => {
    const accountNumber = "0012 9948 2231";
    navigator.clipboard
      .writeText(accountNumber)
      .then(() => {
        const btn = document.getElementById("copyAccountBtn");
        const original = btn.innerHTML;
        btn.innerHTML =
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#1f9d55" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        setTimeout(() => (btn.innerHTML = original), 1400);
      })
      .catch(() => {
        // Clipboard API may be unavailable (e.g. insecure context); fail silently.
      });
  });

  // Init
  goToStep(1);
})();
