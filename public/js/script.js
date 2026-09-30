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

    const recommendationForm = document.querySelector("#recommendationForm");
    const recommendationResults = document.querySelector("#recommendationResults");

    if (recommendationForm && recommendationResults) {
        const escapeRecommendationHtml = (value) => String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

        const renderRecommendation = (listing) => {
            const image = listing.image?.url || "https://placehold.co/900x650/e7efe9/35564a?text=WanderLust";
            const reasons = listing.matchReasons?.map((reason) => `<span><i class="bi bi-check2"></i>${escapeRecommendationHtml(reason)}</span>`).join("") || "";
            return `<article class="recommendation-card"><img src="${escapeRecommendationHtml(image)}" alt="${escapeRecommendationHtml(listing.title)}" loading="lazy"><div class="recommendation-card__body"><div class="d-flex justify-content-between gap-2"><div><span class="eyebrow mb-1">${escapeRecommendationHtml(listing.category || "Stay")}</span><h3>${escapeRecommendationHtml(listing.title)}</h3><p class="text-muted small mb-0"><i class="bi bi-geo-alt"></i> ${escapeRecommendationHtml(listing.location)}, ${escapeRecommendationHtml(listing.country)}</p></div><span class="recommendation-score">${escapeRecommendationHtml(listing.matchScore)}% match</span></div><div class="recommendation-card__reasons">${reasons}</div><div class="recommendation-card__footer"><strong>${Number(listing.price || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}<small> / night</small></strong><a class="btn btn-sm btn-dark rounded-pill" href="/listings/${encodeURIComponent(listing._id)}">View stay <i class="bi bi-arrow-up-right ms-1"></i></a></div></div></article>`;
        };

        recommendationForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const button = recommendationForm.querySelector("button[type='submit']");
            const formData = new FormData(recommendationForm);
            const body = Object.fromEntries(formData.entries());
            button.disabled = true;
            button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Finding your matches...`;
            recommendationResults.classList.remove("d-none");
            recommendationResults.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-success" role="status"></div><p class="text-muted mt-3 mb-0">Comparing stays with your preferences...</p></div>`;

            try {
                const response = await fetch("/api/recommendations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.message || "Recommendations could not be loaded.");
                recommendationResults.innerHTML = payload.data.length
                    ? `<div class="recommendation-results__header"><div><span class="eyebrow">Your shortlist</span><h2>${payload.data.length} stays worth a look</h2></div><span class="text-muted small">Ranked from your preferences</span></div><div class="recommendation-card-grid">${payload.data.map(renderRecommendation).join("")}</div>`
                    : `<div class="empty-state"><i class="bi bi-search"></i><h3>No close matches yet</h3><p>Try broadening your location, budget, or amenity preferences.</p></div>`;
                recommendationResults.scrollIntoView({ behavior: "smooth", block: "start" });
            } catch (error) {
                recommendationResults.innerHTML = `<div class="planner-error"><strong>We couldn’t find recommendations.</strong><p class="mb-0 mt-1">${escapeRecommendationHtml(error.message)}</p></div>`;
            } finally {
                button.disabled = false;
                button.innerHTML = `<i class="bi bi-magic me-2"></i>Find my matches`;
            }
        });
    }

    const semanticForm = document.querySelector("#semanticSearchForm");
    const semanticResults = document.querySelector("#semanticResults");
    const semanticQuery = document.querySelector("#semanticQuery");
    const semanticCharacterCount = document.querySelector("#semanticCharacterCount");

    if (semanticForm && semanticResults && semanticQuery) {
        const escapeSemanticHtml = (value) => String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

        const updateSemanticCount = () => {
            semanticCharacterCount.textContent = `${semanticQuery.value.length} / 1000`;
        };

        const renderSemanticCard = (listing) => {
            const image = listing.image?.url || "https://placehold.co/900x650/e7efe9/35564a?text=WanderLust";
            return `<article class="semantic-card"><img src="${escapeSemanticHtml(image)}" alt="${escapeSemanticHtml(listing.title)}" loading="lazy"><div class="semantic-card__body"><div class="d-flex justify-content-between gap-2"><div><span class="eyebrow mb-1">${escapeSemanticHtml(listing.category || "Stay")}</span><h3>${escapeSemanticHtml(listing.title)}</h3><p class="text-muted small mb-0"><i class="bi bi-geo-alt"></i> ${escapeSemanticHtml(listing.location)}, ${escapeSemanticHtml(listing.country)}</p></div><span class="semantic-score">${escapeSemanticHtml(listing.semanticScore)}% relevant</span></div><p class="semantic-card__description">${escapeSemanticHtml(listing.description || "A place to make your own.")}</p><div class="semantic-card__footer"><strong>${Number(listing.price || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}<small> / night</small></strong><a class="btn btn-sm btn-dark rounded-pill" href="/listings/${encodeURIComponent(listing._id)}">View stay <i class="bi bi-arrow-up-right ms-1"></i></a></div></div></article>`;
        };

        semanticQuery.addEventListener("input", updateSemanticCount);
        updateSemanticCount();

        semanticForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!semanticForm.checkValidity()) {
                semanticForm.classList.add("was-validated");
                return;
            }

            const button = semanticForm.querySelector("button[type='submit']");
            const limit = document.querySelector("#semanticLimit").value;
            button.disabled = true;
            button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Searching meaning...`;
            semanticResults.classList.remove("d-none");
            semanticResults.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-success" role="status"></div><p class="text-muted mt-3 mb-0">Comparing your idea with the listing collection...</p></div>`;

            try {
                const response = await fetch("/api/search/semantic", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query: semanticQuery.value.trim(), limit }),
                });
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.message || "Semantic search could not be completed.");
                semanticResults.innerHTML = payload.data.length
                    ? `<div class="semantic-results__header"><div><span class="eyebrow">Meaningful matches</span><h2>${payload.data.length} stays related to your search</h2></div><span class="text-muted small">${escapeSemanticHtml(payload.meta.vectorStore)}</span></div><div class="semantic-card-grid">${payload.data.map(renderSemanticCard).join("")}</div>`
                    : `<div class="empty-state"><i class="bi bi-search-heart"></i><h3>No semantic matches yet</h3><p>Try describing your destination, mood, activities, or must-have amenities differently.</p></div>`;
                semanticResults.scrollIntoView({ behavior: "smooth", block: "start" });
            } catch (error) {
                semanticResults.innerHTML = `<div class="planner-error"><strong>Semantic search is unavailable.</strong><p class="mb-0 mt-1">${escapeSemanticHtml(error.message)}</p></div>`;
            } finally {
                button.disabled = false;
                button.innerHTML = `<i class="bi bi-search me-2"></i>Search semantically`;
            }
        });
    }

    const assistantForm = document.querySelector("#assistantForm");
    const assistantResult = document.querySelector("#assistantResult");
    const assistantQuestion = document.querySelector("#assistantQuestion");
    const assistantCharacterCount = document.querySelector("#assistantCharacterCount");

    if (assistantForm && assistantResult && assistantQuestion) {
        const escapeAssistantHtml = (value) => String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

        const updateAssistantCount = () => {
            assistantCharacterCount.textContent = `${assistantQuestion.value.length} / 1500`;
        };

        assistantQuestion.addEventListener("input", updateAssistantCount);
        updateAssistantCount();

        document.querySelectorAll("[data-assistant-example]").forEach((example) => {
            example.addEventListener("click", () => {
                assistantQuestion.value = example.dataset.assistantExample;
                updateAssistantCount();
                assistantQuestion.focus();
            });
        });

        assistantForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!assistantForm.checkValidity()) {
                assistantForm.classList.add("was-validated");
                return;
            }

            const button = assistantForm.querySelector("button[type='submit']");
            button.disabled = true;
            button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Searching and thinking...`;
            assistantResult.classList.remove("d-none");
            assistantResult.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-success" role="status"></div><p class="text-muted mt-3 mb-0">Retrieving relevant stays before answering...</p></div>`;

            try {
                const response = await fetch("/api/ai/travel-assistant", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ question: assistantQuestion.value.trim() }),
                });
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.message || "The assistant could not answer right now.");
                const sources = payload.data.sources || [];
                const sourceMarkup = sources.length
                    ? `<div class="assistant-sources"><span class="eyebrow">Sources from WanderLust</span><div class="assistant-source-grid">${sources.map((source) => `<a class="assistant-source" href="/listings/${encodeURIComponent(source.id)}"><span><strong>${escapeAssistantHtml(source.title)}</strong><small>${escapeAssistantHtml(source.location)} · ${escapeAssistantHtml(source.pricePerNight)} / night</small></span><i class="bi bi-arrow-up-right"></i></a>`).join("")}</div></div>`
                    : `<div class="empty-state empty-state--compact"><i class="bi bi-search"></i><p>No matching listing sources were found.</p></div>`;
                assistantResult.innerHTML = `<div class="assistant-result__header"><div><span class="eyebrow">Grounded answer</span><h2>Here’s what I found.</h2></div><span class="text-muted small">Based on retrieved listings</span></div><div class="assistant-answer">${escapeAssistantHtml(payload.data.answer)}</div>${sourceMarkup}`;
                assistantResult.scrollIntoView({ behavior: "smooth", block: "start" });
            } catch (error) {
                assistantResult.innerHTML = `<div class="planner-error"><strong>We couldn’t answer that yet.</strong><p class="mb-0 mt-1">${escapeAssistantHtml(error.message)}</p></div>`;
            } finally {
                button.disabled = false;
                button.innerHTML = `<i class="bi bi-send me-2"></i>Ask WanderLust`;
            }
        });
    }
});
