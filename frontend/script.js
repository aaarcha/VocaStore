const API = "http://127.0.0.1:5000";

let currentEdit = null;

// -------------------------
// NAVIGATION
// -------------------------
function showPage(pageId) {

    document.querySelectorAll(".page")
        .forEach(p => p.classList.remove("active"));

    document.getElementById(pageId)
        .classList.add("active");

    if (pageId === "inventory") loadProducts();
    if (pageId === "sales") loadSales();
    if (pageId === "summary") loadSummary();
}

// -------------------------
// SPEAK
// -------------------------
function speak(text) {
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = "en-PH";
    speechSynthesis.speak(msg);
}

// -------------------------
// COMMAND
// -------------------------
function sendCommand() {

    const cmd = document.getElementById("command").value;

    fetch(API + "/process-command", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({command: cmd})
    })
    .then(r => r.json())
    .then(data => {

        document.getElementById("response").innerText = data.message;
        speak(data.message);

        loadProducts();
        loadSales();
        loadSummary();
    });
}

// -------------------------
// VOICE
// -------------------------
function startVoice() {

    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-PH";

    recognition.start();

    recognition.onresult = (e) => {
        document.getElementById("command").value =
            e.results[0][0].transcript;

        sendCommand();
    };
}

// -------------------------
// PRODUCTS
// -------------------------
function loadProducts() {

    fetch(API + "/products")
        .then(r => r.json())
        .then(res => {

            const table = document.getElementById("productTable");
            table.innerHTML = "";

            (res.data || []).forEach(p => {

                table.innerHTML += `
                    <tr>
                        <td>${p.name}</td>
                        <td>₱${p.price}</td>
                        <td>${p.stock}</td>
                        <td>
                            <button onclick="openEdit(${p.id}, '${p.name}', ${p.price}, ${p.stock})">
                                Edit
                            </button>
                            <button onclick="deleteProduct(${p.id})">
                                Delete
                            </button>
                        </td>
                    </tr>
                `;
            });
        });
}

// -------------------------
// FILTER
// -------------------------
function filterProducts() {

    const input = document.getElementById("search").value.toLowerCase();

    document.querySelectorAll("#productTable tr")
        .forEach(row => {
            row.style.display =
                row.innerText.toLowerCase().includes(input)
                    ? ""
                    : "none";
        });
}

// -------------------------
// EDIT PANEL
// -------------------------
function openEdit(id, name, price, stock) {

    currentEdit = id;

    document.getElementById("editId").value = id;
    document.getElementById("editName").value = name;
    document.getElementById("editPrice").value = price;
    document.getElementById("editStock").value = stock;

    document.getElementById("editPanel").classList.add("active");
}

function closeEdit() {
    document.getElementById("editPanel").classList.remove("active");
}

// -------------------------
// SAVE EDIT (FIXED)
// -------------------------
function saveEdit() {

    fetch(API + "/update-product", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            id: document.getElementById("editId").value,
            name: document.getElementById("editName").value,
            price: parseFloat(document.getElementById("editPrice").value),
            stock: parseInt(document.getElementById("editStock").value)
        })
    })
    .then(r => r.json())
    .then(data => {

        alert(data.message);

        closeEdit();
        loadProducts();
    });
}

// -------------------------
// DELETE
// -------------------------
function deleteProduct(id) {

    if (!confirm("Delete this product?")) return;

    fetch(API + "/delete-product", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({id})
    })
    .then(r => r.json())
    .then(data => {

        alert(data.message);
        loadProducts();
    });
}

// -------------------------
// SALES (REAL DB)
// -------------------------
function loadSales() {

    fetch(API + "/sales")
        .then(r => r.json())
        .then(res => {

            const box = document.getElementById("salesList");
            box.innerHTML = "";

            (res.data || []).forEach(s => {

                box.innerHTML += `
                    <div class="card">
                        <b>${s.product}</b><br>
                        Qty: ${s.quantity}<br>
                        Total: ₱${s.total}<br>
                        <small>${s.date}</small>
                    </div>
                `;
            });
        });
}

// -------------------------
// SUMMARY (REAL DB)
// -------------------------
function loadSummary() {

    fetch(API + "/summary")
        .then(r => r.json())
        .then(res => {

            const d = res.data;

            document.getElementById("summaryBox").innerHTML = `
                <p>📊 Total Sales: ₱${d.total_sales}</p>
                <p>🧾 Transactions: ${d.transactions}</p>
                <p>🔥 Top Product: ${d.top_product}</p>
                <p>⚠ Low Stock:</p>
                ${d.low_stock.map(p => `<p>- ${p.name} (${p.stock})</p>`).join("")}
            `;
        });
}

// INIT
loadProducts();