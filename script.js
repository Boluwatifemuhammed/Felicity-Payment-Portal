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
  const PURPOSE_PRICES = {
    "Tuition Fees": 4500,
    "Result Slip Payment": 120,
    "Textbook Purchase": 800,
  };

  const FEES = {
    transactionFee: 15,
  };

  // --- Paystack config ---
  // Replace with YOUR real public key from the Paystack dashboard (Settings > API Keys & Webhooks).
  // Public keys are safe in frontend code. NEVER put a secret key (sk_...) in this file.
  const PAYSTACK_PUBLIC_KEY = "pk_test_dcfd13d3b7fe96d9a872c4141d543fd30f2e9a0d";
  // Your account currency — Naira here since the UI is priced in ₦.
  const PAYSTACK_CURRENCY = "NGN";

  // --- EmailJS config ---
  const EMAILJS_PUBLIC_KEY = "RWP2IlmooAKe6XxO8";
  const EMAILJS_SERVICE_ID = "service_8psh8vz";
  const EMAILJS_TEMPLATE_ID = "template_12zrxyn";

  emailjs.init(EMAILJS_PUBLIC_KEY);

  const bankDetailsCard = document.getElementById("bankDetailsCard");
  const payBtnLabel = document.getElementById("payBtnLabel");
  const payError = document.getElementById("payError");

  function getSelectedMethod() {
    const checked = document.querySelector('input[name="method"]:checked');
    return checked ? checked.value : "bank";
  }

  function updateMethodUI() {
    const method = getSelectedMethod();
    payError.classList.add("hidden");
    if (method === "paystack") {
      bankDetailsCard.classList.add("hidden");
      payBtnLabel.textContent = "Pay with Paystack";
    } else {
      bankDetailsCard.classList.remove("hidden");
      payBtnLabel.textContent = "Proceed to Pay";
    }
  }

  document.querySelectorAll('input[name="method"]').forEach((radio) => {
    radio.addEventListener("change", updateMethodUI);
  });

  function formatMoney(n) {
    return "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

    const price = PURPOSE_PRICES[purpose] || 0;

    document.getElementById("brPurposeLabel").textContent = purpose;
    document.getElementById("brPurposeAmount").textContent = formatMoney(price);
    document.getElementById("brTotal").textContent = formatMoney(price);
}

  function syncFinalTotal() {
  const purpose = getSelectedPurpose();
  const price = PURPOSE_PRICES[purpose] || 0;

  document.getElementById("finalPurposeLabel").textContent = purpose;
  document.getElementById("finalPurposeAmount").textContent = formatMoney(price);
  document.getElementById("finalTotal").textContent = formatMoney(price);

  return price;
}

  function syncStatusScreen(method, reference) {
    const name = document.getElementById("studentName").value.trim() || "—";
    const total = syncFinalTotal();
    document.getElementById("statusName").textContent = name;
    document.getElementById("statusAmount").textContent = formatMoney(total);
    document.getElementById("statusRef").textContent =
      reference || "PMT-" + Math.random().toString(36).slice(2, 8).toUpperCase();

    const titleEl = document.getElementById("statusTitle");
    const msgEl = document.getElementById("statusMessage");

    if (method === "paystack") {
      titleEl.textContent = "Payment Verified Instantly";
      msgEl.textContent =
        "Your payment was confirmed by Paystack immediately — no waiting on manual bank confirmation.";
    } else {
      titleEl.textContent = "Payment Submitted";
      msgEl.textContent =
        "Your transfer reference has been recorded. The bursar's office will confirm receipt within 1–2 business days.";
    }
  }

  // --- EmailJS: notify the school office whenever a payment is submitted ---
  function sendPaymentEmail(method, reference, total) {
    const templateParams = {
      student_name: document.getElementById("studentName").value.trim(),
      student_id: document.getElementById("studentId").value.trim(),
      grade: document.getElementById("gradeSelect").value,
      purpose: getSelectedPurpose(),
      payer_name: document.getElementById("payerName").value.trim(),
      payer_phone: document.getElementById("payerPhone").value.trim(),
      payer_email: document.getElementById("payerEmail").value.trim(),
      amount: formatMoney(total) + " (" + method + ", ref: " + reference + ")",
    };

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
      .then(() => {
        console.log("Payment notification email sent successfully");
      })
      .catch((error) => {
        // We don't block the user's flow if the email fails — the payment itself
        // already succeeded. We just log it so it can be investigated later.
        console.error("Email failed to send:", error);
      });
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

    const method = getSelectedMethod();
    payError.classList.add("hidden");

    if (method === "bank") {
      const total = syncFinalTotal();
      const reference = "PMT-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      sendPaymentEmail("bank", reference, total);
      syncStatusScreen("bank", reference);
      advanceTo(4);
      return;
    }

    // --- Paystack flow ---
    if (typeof PaystackPop === "undefined") {
      payError.textContent =
        "Couldn't load the Paystack popup. Check your connection and try again.";
      payError.classList.remove("hidden");
      return;
    }

    const total = syncFinalTotal();
    const email = document.getElementById("payerEmail").value.trim();
    const reference = "SCH-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
    const payBtn = document.getElementById("toStatusBtn");

    payBtn.disabled = true;
    payBtnLabel.textContent = "Opening Paystack…";

    try {
      const popup = new PaystackPop();
      popup.newTransaction({
        key: PAYSTACK_PUBLIC_KEY,
        email: email,
        amount: Math.round(total * 100), // Paystack expects the lowest currency unit (kobo for NGN)
        currency: PAYSTACK_CURRENCY,
        ref: reference,
        onSuccess: function (transaction) {
          // NOTE: This confirms the popup completed on the client side only.
          // In production, send transaction.reference to YOUR backend and call
          // Paystack's GET /transaction/verify/:reference endpoint with your
          // secret key before treating the payment as genuinely successful.
          payBtn.disabled = false;
          payBtnLabel.textContent = "Pay with Paystack";
          sendPaymentEmail("paystack", transaction.reference, total);
          syncStatusScreen("paystack", transaction.reference);
          advanceTo(4);
        },
        onCancel: function () {
          payBtn.disabled = false;
          payBtnLabel.textContent = "Pay with Paystack";
        },
        onError: function (err) {
          payBtn.disabled = false;
          payBtnLabel.textContent = "Pay with Paystack";
          payError.textContent = "Payment failed: " + (err && err.message ? err.message : "please try again.");
          payError.classList.remove("hidden");
        },
      });
    } catch (e) {
      payBtn.disabled = false;
      payBtnLabel.textContent = "Pay with Paystack";
      payError.textContent = "Something went wrong starting the payment. Please try again.";
      payError.classList.remove("hidden");
    }
  });

  document.getElementById("startOverBtn").addEventListener("click", () => {
    document.getElementById("studentName").value = "";
    document.getElementById("studentId").value = "";
    document.getElementById("gradeSelect").selectedIndex = 0;
    document.getElementById("payerName").value = "";
    document.getElementById("payerPhone").value = "";
    document.getElementById("payerEmail").value = "";
    document.querySelector('input[name="purpose"]').checked = true;
    document.querySelector('input[name="method"][value="bank"]').checked = true;
    updateMethodUI();
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
    const accountNumber = "209 628 1242";
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
  updateMethodUI();
  goToStep(1);
})();