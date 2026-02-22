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
            }

            form.classList.add("was-validated");
        });
    });
});
