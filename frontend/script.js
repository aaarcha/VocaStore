const API = "https://vocastore-production.up.railway.app";

let currentEdit = null;

function showPage(pageId) {

    document.querySelectorAll(".page")
        .forEach(p => p.classList.remove("active"));

    document.getElementById(pageId)
        .classList.add("active");

    if (pageId === "inventory") loadProducts();
    if (pageId === "sales") loadSales();
    if (pageId === "summary") loadSummary();
}

function speak(text) {
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = "en-PH";
    speechSynthesis.speak(msg);
}

async function sendCommand() {

    const cmd = document.getElementById("command").value;

    try {

        const res = await fetch(API + "/process-command", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ command: cmd })
        });

        const data = await res.json();

        document.getElementById("response").innerText =
            data.message || "No response";

        speak(data.message || "Done");

        loadProducts();
        loadSales();
        loadSummary();

    } catch (err) {

        console.error(err);

        document.getElementById("response").innerText =
            "Server error";
    }
}

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

async function loadProducts() {

    try {

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

    } catch (err) {

        console.error(err);
    }
}

function filterProducts() {

    const input =
        document.getElementById("search").value.toLowerCase();

    document.querySelectorAll("#productTable tr")
        .forEach(row => {

            row.style.display =
                row.innerText.toLowerCase().includes(input)
                    ? ""
                    : "none";
        });
}

function openEdit(id, name, price, stock) {

    currentEdit = id;

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

async function saveEdit() {

    try {

        const res = await fetch(API + "/update-product", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: parseInt(document.getElementById("editId").value),
                name: document.getElementById("editName").value,
                price: parseFloat(document.getElementById("editPrice").value),
                stock: parseInt(document.getElementById("editStock").value)
            })
        });

        const data = await res.json();

        alert(data.message || "Updated");

        closeEdit();

        loadProducts();

    } catch (err) {

        console.error(err);
        alert("Update failed");
    }
}

async function deleteProduct(id) {

    if (!confirm("Delete this product?")) return;

    try {

        const res = await fetch(API + "/delete-product", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ id })
        });

        const data = await res.json();

        alert(data.message || "Deleted");

        loadProducts();

    } catch (err) {

        console.error(err);
        alert("Delete failed");
    }
}

async function loadSales() {

    try {

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

    } catch (err) {

        console.error(err);
    }
}

async function loadSummary() {

    try {

        const res = await fetch(API + "/summary");
        const resData = await res.json();

        const d = resData.data;

        document.getElementById("summaryBox").innerHTML = `
            <p>📊 Total Sales: ₱${d.total_sales}</p>
            <p>🧾 Transactions: ${d.transactions}</p>
            <p>🔥 Top Product: ${d.top_product}</p>
            <p>⚠ Low Stock:</p>
            ${d.low_stock.map(
                p => `<p>- ${p.name} (${p.stock})</p>`
            ).join("")}
        `;

    } catch (err) {

        console.error(err);
    }
}

loadProducts();