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

        const lowered = cmd.toLowerCase();

        const summary = await fetch(API + "/summary");
        const resData = await summary.json();
        const d = resData.data || {};

        if (lowered.includes("top sales") ||
            lowered.includes("top product")) {

            showPopup(`
                <h2>🔥 Top Selling Product</h2>

                <div class="card">
                    <h3>${d.top_product || "None"}</h3>
                </div>
            `);
        }

        else if (lowered.includes("low stock")) {

            showPopup(`
                <h2>⚠ Low Stock Products</h2>

                ${(d.low_stock || [])
                    .filter(p => p.stock <= 10)
                    .map(p => `
                        <div class="card">
                            <b>${p.name}</b><br>
                            Remaining Stock: ${p.stock}
                        </div>
                    `).join("") || "<p>No low stock items</p>"}
            `);
        }

        else if (lowered.includes("analytics")) {

            showPopup(`
                <h2>📊 Store Analytics</h2>

                <div class="card">
                    <b>Total Sales:</b><br>
                    ₱${d.total_sales || 0}
                </div>

                <div class="card">
                    <b>Transactions:</b><br>
                    ${d.transactions || 0}
                </div>

                <div class="card">
                    <b>Top Product:</b><br>
                    ${d.top_product || "None"}
                </div>
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

    const overlay = document.getElementById("popupOverlay");
    const content = document.getElementById("popupContent");

    content.innerHTML = html;

    overlay.classList.remove("hidden");
}

function closePopup(event) {

    if (
        !event ||
        event.target.id === "popupOverlay" ||
        event.target.classList.contains("close-btn")
    ) {
        document.getElementById("popupOverlay")
            .classList.add("hidden");
    }
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

    document.getElementById("dashboardSummary").innerHTML = "";
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