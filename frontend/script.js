const API = "https://vocastore-production.up.railway.app";

function showPage(pageId) {

    document.querySelectorAll(".page")
        .forEach(p => p.classList.remove("active"));

    document.getElementById(pageId)
        .classList.add("active");

    if (pageId === "inventory") loadProducts();
    if (pageId === "sales") loadSales();
    if (pageId === "summary") loadSummary();
    if (pageId === "dashboard") loadDashboardSummary();
}

function speak(text) {
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = "en-PH";
    speechSynthesis.speak(msg);
}

/* -----------------------------
   SMART COMMAND TRIGGER SYSTEM
------------------------------ */

function detectAnalyticsIntent(text) {

    text = text.toLowerCase();

    if (text.includes("top sales") ||
        text.includes("top product") ||
        text.includes("sales trend") ||
        text.includes("analytics") ||
        text.includes("low stock")) {
        return "ANALYTICS";
    }

    return null;
}

async function sendCommand() {

    const cmd = document.getElementById("command").value;

    try {

        const res = await fetch(API + "/process-command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command: cmd })
        });

        const data = await res.json();

        const msg = data.message || "No response";

        document.getElementById("response").innerText = msg;
        speak(msg);

        const intent = detectAnalyticsIntent(cmd);

        if (intent === "ANALYTICS") {

            const summary = await fetch(API + "/summary");
            const resData = await summary.json();
            const d = resData.data || {};

            showPopup(`
                <h3>📊 Analytics</h3>

                <p><b>🔥 Top Product:</b> ${d.top_product || "None"}</p>

                <p><b>⚠ Low Stock (≤10):</b></p>

                ${(d.low_stock || [])
                    .filter(p => p.stock <= 10)
                    .map(p => `<p>- ${p.name} (${p.stock})</p>`)
                    .join("") || "<p>No low stock items</p>"}
            `);
        }

        setTimeout(() => {
            loadProducts();
            loadSales();
            loadSummary();
            loadDashboardSummary();
        }, 300);

    } catch (err) {
        console.error(err);
        document.getElementById("response").innerText = "Server error";
    }
}

/* -----------------------------
   POPUP SYSTEM
------------------------------ */

function showPopup(html) {

    const popup = document.getElementById("popup");
    const content = document.getElementById("popupContent");

    content.innerHTML = html;
    popup.classList.remove("hidden");
}

function closePopup() {
    document.getElementById("popup").classList.add("hidden");
}

/* -----------------------------
   VOICE INPUT
------------------------------ */

function startVoice() {

    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Voice recognition not supported");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-PH";

    recognition.start();

    recognition.onresult = (e) => {
        document.getElementById("command").value =
            e.results[0][0].transcript;

        sendCommand();
    };
}

/* -----------------------------
   DASHBOARD SUMMARY
------------------------------ */

async function loadDashboardSummary() {

    const res = await fetch(API + "/summary");
    const resData = await res.json();

    const d = resData.data || {};

    document.getElementById("dashboardSummary").innerHTML = `
        <div class="card">
            <h3>Quick Analytics</h3>
            <p>Say: "top sales", "low stock", "analytics"</p>
        </div>
    `;
}

/* -----------------------------
   INVENTORY
------------------------------ */

async function loadProducts() {

    const res = await fetch(API + "/products");
    const data = await res.json();

    const table = document.getElementById("productTable");
    table.innerHTML = "";

    (data.data || []).forEach(p => {

        table.innerHTML += `
            <tr>
                <td>${p.name}</td>
                <td>₱${p.price}</td>
                <td>${p.stock}</td>
                <td>
                    <button onclick="openEdit(${p.id}, '${p.name}', ${p.price}, ${p.stock})">Edit</button>
                    <button onclick="deleteProduct(${p.id})">Delete</button>
                </td>
            </tr>
        `;
    });
}

/* -----------------------------
   SALES
------------------------------ */

async function loadSales() {

    const res = await fetch(API + "/sales");
    const data = await res.json();

    const box = document.getElementById("salesList");
    box.innerHTML = "";

    (data.data || []).forEach(s => {

        box.innerHTML += `
            <div class="card">
                <b>${s.product}</b><br>
                Qty: ${s.quantity}<br>
                Total: ₱${s.total}<br>
                <small>${s.date}</small>
            </div>
        `;
    });
}

/* -----------------------------
   SUMMARY PAGE
------------------------------ */

async function loadSummary() {

    const res = await fetch(API + "/summary");
    const resData = await res.json();

    const d = resData.data || {
        total_sales: 0,
        transactions: 0,
        top_product: "None",
        low_stock: []
    };

    document.getElementById("summaryBox").innerHTML = `
        <p>📊 Total Sales: ₱${d.total_sales}</p>
        <p>🧾 Transactions: ${d.transactions}</p>
        <p>🔥 Top Product: ${d.top_product}</p>

        <p>⚠ Low Stock (≤10):</p>

        ${(d.low_stock || [])
            .filter(p => p.stock <= 10)
            .map(p => `<p>- ${p.name} (${p.stock})</p>`)
            .join("")}
    `;
}

/* -----------------------------
   EDIT FUNCTIONS (unchanged)
------------------------------ */

function openEdit(id, name, price, stock) {

    document.getElementById("editId").value = id;
    document.getElementById("editName").value = name;
    document.getElementById("editPrice").value = price;
    document.getElementById("editStock").value = stock;

    document.getElementById("editPanel")
        .classList.add("active");
}

function closeEdit() {
    document.getElementById("editPanel")
        .classList.remove("active");
}

loadProducts();
loadDashboardSummary();