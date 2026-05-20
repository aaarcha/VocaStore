const API = "https://vocastore-production.up.railway.app";

let cart = [];

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

async function sendCommand() {

    const cmd = document.getElementById("command").value;

    try {

        const lowered = cmd.toLowerCase();

        if (lowered.startsWith("add to cart")) {

            const cleaned =
                lowered.replace("add to cart", "").trim();

            const parts = cleaned.split(" ");

            const quantity = parseInt(parts[0]) || 1;

            const product =
                parts.slice(1).join(" ");

            await addToCart(product, quantity);

            document.getElementById("response").innerText =
                `${product} added to cart`;

            speak(`${product} added to cart`);

            return;
        }

        const res = await fetch(API + "/process-command", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                command: cmd
            })
        });

        const data = await res.json();

        const msg = data.message || "No response";

        document.getElementById("response").innerText = msg;

        speak(msg);

        const summary = await fetch(API + "/summary");

        const resData = await summary.json();

        const d = resData.data || {};

        if (
            lowered.includes("top sales") ||
            lowered.includes("top product")
        ) {

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

        document.getElementById("response").innerText =
            "Server error";
    }
}

function showPopup(html) {

    const overlay =
        document.getElementById("popupOverlay");

    const content =
        document.getElementById("popupContent");

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

function startVoice() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

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

async function loadDashboardSummary() {

    document.getElementById("dashboardSummary")
        .innerHTML = "";
}

async function loadProducts() {

    const res = await fetch(API + "/products");

    const data = await res.json();

    const table =
        document.getElementById("productTable");

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

                    <button onclick="addToCart('${p.name}', 1)">
                        Add To Cart
                    </button>
                </td>
            </tr>
        `;
    });
}

async function loadSales() {

    const res = await fetch(API + "/sales");

    const data = await res.json();

    const box =
        document.getElementById("salesList");

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

function filterProducts() {

    const input =
        document.getElementById("search")
            .value
            .toLowerCase();

    document.querySelectorAll("#productTable tr")
        .forEach(row => {

            row.style.display =
                row.innerText.toLowerCase().includes(input)
                    ? ""
                    : "none";
        });
}

async function saveEdit() {

    try {

        const res = await fetch(API + "/update-product", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                id: parseInt(
                    document.getElementById("editId").value
                ),

                name:
                    document.getElementById("editName").value,

                price: parseFloat(
                    document.getElementById("editPrice").value
                ),

                stock: parseInt(
                    document.getElementById("editStock").value
                )
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

    if (!confirm("Delete this product?")) {
        return;
    }

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

async function addToCart(productName, quantity = 1) {

    try {

        const res = await fetch(API + "/products");

        const data = await res.json();

        const products = data.data || [];

        const product = products.find(
            p => p.name.toLowerCase() === productName.toLowerCase()
        );

        if (!product) {

            alert("Product not found");

            return;
        }

        const existing = cart.find(
            item =>
                item.name.toLowerCase() ===
                product.name.toLowerCase()
        );

        if (existing) {

            existing.quantity += quantity;
        }

        else {

            cart.push({
                name: product.name,
                price: product.price,
                quantity: quantity
            });
        }

        renderCart();

    } catch (err) {

        console.error(err);
    }
}

function renderCart() {

    let cartBox =
        document.getElementById("cartItems");

    if (!cartBox) {

        const dashboard =
            document.getElementById("dashboard");

        const cartHTML = `
            <div class="card">
                <h2>🛒 Cart</h2>

                <div id="cartItems"></div>

                <h3 id="cartTotal">
                    Total: ₱0
                </h3>

                <button onclick="checkoutCart()">
                    Checkout
                </button>
            </div>
        `;

        dashboard.insertAdjacentHTML(
            "beforeend",
            cartHTML
        );

        cartBox =
            document.getElementById("cartItems");
    }

    cartBox.innerHTML = "";

    let total = 0;

    cart.forEach((item, index) => {

        const subtotal =
            item.price * item.quantity;

        total += subtotal;

        cartBox.innerHTML += `
            <div class="card">
                <b>${item.name}</b><br>

                Qty: ${item.quantity}<br>

                Subtotal: ₱${subtotal}

                <br><br>

                <button onclick="removeFromCart(${index})">
                    Remove
                </button>
            </div>
        `;
    });

    document.getElementById("cartTotal")
        .innerText =
        "Total: ₱" + total;
}

function removeFromCart(index) {

    cart.splice(index, 1);

    renderCart();
}

async function checkoutCart() {

    if (cart.length === 0) {

        alert("Cart is empty");

        return;
    }

    try {

        for (const item of cart) {

            await fetch(API + "/process-command", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    command:
                        `sell ${item.quantity} ${item.name}`
                })
            });
        }

        alert("Checkout successful!");

        cart = [];

        renderCart();

        loadProducts();
        loadSales();
        loadSummary();

    } catch (err) {

        console.error(err);

        alert("Checkout failed");
    }
}

loadProducts();

loadDashboardSummary();