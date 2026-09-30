// Bootstrap validation for forms with .needs-validation
// Ensures price is positive and shows Bootstrap feedback

document.addEventListener("DOMContentLoaded", () => {
    const forms = document.querySelectorAll(".needs-validation");

    forms.forEach((form) => {
        form.addEventListener("submit", (event) => {
            const priceInput = form.querySelector("#price");

            if (priceInput) {
                const priceValue = Number(priceInput.value);
                if (Number.isNaN(priceValue) || priceValue < 1) {
                    priceInput.setCustomValidity("Price must be at least 1.");
                } else {
                    priceInput.setCustomValidity("");
                }
            }

            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            form.classList.add("was-validated");

            const submitButton = form.querySelector("button[type='submit']");
            if (submitButton && submitButton.dataset.loadingText) {
                submitButton.disabled = true;
                submitButton.dataset.originalText = submitButton.innerHTML;
                submitButton.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>${submitButton.dataset.loadingText}`;
            }
        });
    });

    document.querySelectorAll("form:not(.needs-validation)").forEach((form) => {
        form.addEventListener("submit", () => {
            const submitButton = form.querySelector("button[type='submit'][data-loading-text]");
            if (!submitButton) return;
            submitButton.disabled = true;
            submitButton.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>${submitButton.dataset.loadingText}`;
        });
    });

    document.querySelectorAll("[data-integer-only]").forEach((input) => {
        input.addEventListener("input", () => {
            input.value = input.value.replace(/\D/g, "");
        });
    });

    const plannerForm = document.querySelector("#travelPlannerForm");
    const plannerResult = document.querySelector("#plannerResult");
    const plannerPrompt = document.querySelector("#travelPrompt");
    const plannerCharacterCount = document.querySelector("#plannerCharacterCount");

    if (plannerForm && plannerResult && plannerPrompt) {
        const escapeHtml = (value) => String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

        const renderList = (items) => items?.length
            ? `<ul class="planner-result__list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
            : `<p class="text-muted">No specific suggestions were returned.</p>`;

        const renderPlan = (plan) => {
            const days = plan.itinerary?.length
                ? plan.itinerary.map((day) => `<div class="col-md-6"><article class="planner-day"><span class="planner-day__number">${escapeHtml(day.day)}</span><h3>${escapeHtml(day.title)}</h3><p><strong>Morning</strong>${escapeHtml(day.morning)}</p><p><strong>Afternoon</strong>${escapeHtml(day.afternoon)}</p><p><strong>Evening</strong>${escapeHtml(day.evening)}</p></article></div>`).join("")
                : `<p class="text-muted">No day-by-day itinerary was returned.</p>`;
            const budget = plan.estimatedBudget || {};

            return `<div class="planner-result__header"><span class="eyebrow">Your plan is ready</span><h2>Make room for wonder.</h2><p class="planner-result__overview mb-0">${escapeHtml(plan.tripOverview)}</p></div><div class="mb-4"><span class="eyebrow">Day by day</span><div class="row g-3">${days}</div></div><div class="row g-4"><div class="col-md-4"><span class="eyebrow">Recommended activities</span>${renderList(plan.recommendedActivities)}</div><div class="col-md-4"><span class="eyebrow">Suggested locations</span>${renderList(plan.suggestedLocations)}</div><div class="col-md-4"><span class="eyebrow">Estimated budget</span><div class="planner-result__budget"><strong>${escapeHtml(budget.currency)} ${escapeHtml(budget.total)}</strong>${renderList(budget.breakdown)}</div></div></div><div class="detail-section"><span class="eyebrow">Travel tips</span>${renderList(plan.travelTips)}</div>`;
        };

        const updateCount = () => {
            if (plannerCharacterCount) plannerCharacterCount.textContent = `${plannerPrompt.value.length} / 3000`;
        };

        plannerPrompt.addEventListener("input", updateCount);
        updateCount();

        plannerForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!plannerForm.checkValidity()) {
                plannerForm.classList.add("was-validated");
                return;
            }

            const button = plannerForm.querySelector("button[type='submit']");
            button.disabled = true;
            button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Planning your escape...`;
            plannerResult.classList.remove("d-none");
            plannerResult.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-success" role="status"></div><p class="text-muted mt-3 mb-0">Gathering ideas for your journey...</p></div>`;
            plannerResult.scrollIntoView({ behavior: "smooth", block: "start" });

            try {
                const response = await fetch("/api/ai/travel-plan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt: plannerPrompt.value.trim() }),
                });
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.message || "The planner could not create a plan.");
                plannerResult.innerHTML = renderPlan(payload.data);
            } catch (error) {
                plannerResult.innerHTML = `<div class="planner-error"><strong>We couldn’t create your plan yet.</strong><p class="mb-0 mt-1">${escapeHtml(error.message)} Please try again shortly.</p></div>`;
            } finally {
                button.disabled = false;
                button.innerHTML = `<i class="bi bi-stars me-2"></i>Generate my itinerary`;
            }
        });
    }
});
