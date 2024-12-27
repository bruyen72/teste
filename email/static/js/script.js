document.getElementById("contactForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch("/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const result = await response.json();
        document.getElementById("responseMessage").innerText = result.message;
    } catch (error) {
        document.getElementById("responseMessage").innerText = "Erro ao enviar mensagem.";
        console.error(error);
    }
});
