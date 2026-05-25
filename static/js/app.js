const API = "https://vocastore-production.up.railway.app";

let cart = [];
let voiceEnabled = true;

async function showPage(page) {

    const content = document.getElementById("content");

    document.querySelectorAll(".sidebar-nav button").forEach(b => b.classList.remove("active"));
    const activeBtn = document.getElementById(`nav-${page}`);
    if (activeBtn) activeBtn.classList.add("active");

    // POS Cart is rendered locally, no fetch needed
    if (page === "pos") {
        content.innerHTML = renderPosPage();
        return;
    }

    try {

        const res  = await fetch(`/${page}`);
        const html = await res.text();
        content.innerHTML = html;

        if (page === "dashboard") {
            loadDashboardSummary();
            renderDashCart(); // show current cart when returning to dashboard
        }

        if (page === "inventory") {
            initInventory();
        }

        if (page === "sales") {
            loadSales();
        }

        if (page === "summary") {
            loadSummary();
        }

    } catch (err) {

        console.error(err);
        content.innerHTML = `<h2>Failed to load page</h2>`;
    }
}

function speak(text) {

    if (!voiceEnabled) return;

    const msg = new SpeechSynthesisUtterance(text);

    msg.lang = "en-PH";

    speechSynthesis.speak(msg);
}

async function sendCommand() {

    const cmd =
        document.getElementById("command").value;

    try {

        const lowered =
            cmd.toLowerCase();

        if (lowered.startsWith("add to cart")) {

            const cleaned =
                lowered.replace("add to cart", "").trim();

            const numberWords = {

                "isa": 1,
                "isang": 1,

                "dalawa": 2,
                "dalawang": 2,

                "tatlo": 3,
                "tatlong": 3,

                "apat": 4,

                "lima": 5,
                "limang": 5,

                "anim": 6,

                "pito": 7,
                "pitong": 7,

                "walo": 8,
                "walong": 8,

                "siyam": 9,

                "sampu": 10,
                "sampung": 10
            };

            const parts =
                cleaned.split(" ");

            let quantity =
                parseInt(parts[0]);

            if (isNaN(quantity)) {

                quantity =
                    numberWords[parts[0]] || 1;
            }

            const product =
                parts.slice(1).join(" ");

            await addToCart(product, quantity);

            document.getElementById("response")
                .innerText =
                `${product} added to cart`;

            speak(`${product} added to cart`);

            return;
        }

        const summary =
            await fetch("/api/summary");

        const resData =
            await summary.json();

        const d =
            resData.data || {};

        // TOP SALES / TOP PRODUCT
        if (
            lowered.includes("top sales") ||
            lowered.includes("top selling") ||
            lowered.includes("top product")
        ) {

            const msg =
                `Top selling product is ${d.top_product || "None"}`;

            document.getElementById("response")
                .innerText = msg;

            speak(msg);

            showPopup(`
                <h2>🔥 Top Selling Product</h2>

                <div class="card">
                    <h3>${d.top_product || "None"}</h3>
                </div>
            `);

            return;
        }

        // SALES TREND
        if (
            lowered.includes("sales trend") ||
            lowered.includes("sales report")
        ) {

            const msg = "Showing sales trend";

            document.getElementById("response")
                .innerText = msg;

            speak(msg);

            showPopup(`
                <h2>📈 Sales Trend</h2>

                <div class="card">
                    <p>Total Sales</p>
                    <h1>₱${d.total_sales || 0}</h1>
                </div>

                <div class="card">
                    <p>Total Transactions</p>
                    <h1>${d.transactions || 0}</h1>
                </div>
            `);

            return;
        }

        // ANALYTICS
        if (
            lowered.includes("analytics")
        ) {

            const msg = "Showing analytics";

            document.getElementById("response")
                .innerText = msg;

            speak(msg);

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

            return;
        }

        // NORMAL AI COMMANDS
        const res =
            await fetch("/process-command", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    command: cmd
                })
            });

        const data =
            await res.json();

        const msg =
            data.message || "No response";

        document.getElementById("response")
            .innerText = msg;

        speak(msg);

        if (
            lowered.includes("top sales") ||
            lowered.includes("top selling") ||
            lowered.includes("top product")
        ) {

            showPopup(`
                <h2>🔥 Top Selling Product</h2>

                <div class="card">
                    <h3>${d.top_product || "None"}</h3>
                </div>
            `);
        }

        else if (
            lowered.includes("low stock")
        ) {

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

        else if (
            lowered.includes("analytics")
        ) {

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

        document.getElementById("response")
            .innerText =
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

    const recognition =
        new SpeechRecognition();

    recognition.lang = "en-PH";

    recognition.start();

    recognition.onresult = (e) => {

        document.getElementById("command").value =
            e.results[0][0].transcript;

        sendCommand();
    };
}

async function loadDashboardSummary() {

    try {

        const res =
            await fetch("/api/summary");

        const resData =
            await res.json();

        const d =
            resData.data || {};

        // New dashboard uses these elements
        const totalEl = document.getElementById("todayTotal");
        const countEl = document.getElementById("todayCount");
        const listEl  = document.getElementById("lowStockList");

        if (totalEl) totalEl.textContent = `₱${(d.total_sales || 0).toFixed(2)}`;
        if (countEl) countEl.textContent = `From ${d.transactions || 0} transaction${d.transactions !== 1 ? "s" : ""}`;

        if (listEl) {
            const low = d.low_stock || [];
            if (low.length === 0) {
                listEl.innerHTML = `<p class="no-data">All stock levels are good!</p>`;
            } else {
                listEl.innerHTML = low.slice(0, 4).map(p => `
                    <div class="low-stock-item">
                        <span class="item-name">${p.name}</span>
                        <span class="low-stock-badge">${p.stock} left</span>
                    </div>
                `).join("");
            }
        }

        // Old dashboard fallback (dashboardSummary element)
        const dashboardSummary =
            document.getElementById("dashboardSummary");

        if (dashboardSummary) {

            dashboardSummary.innerHTML = `

                <div style="display:flex;flex-direction:column;gap:16px;">

                    <div class="card">
                        <h3>Total Sales</h3>

                        <h1 style="margin-top:8px;">
                            ₱${d.total_sales || 0}
                        </h1>
                    </div>

                    <div class="card">
                        <h3>Transactions</h3>

                        <h1 style="margin-top:8px;">
                            ${d.transactions || 0}
                        </h1>
                    </div>

                    <div class="card">
                        <h3>Top Product</h3>

                        <h1 style="margin-top:8px;">
                            ${d.top_product || "None"}
                        </h1>
                    </div>

                </div>
            `;
        }

    } catch (err) {

        console.error(err);
    }
}

async function loadProducts() {

    try {

        const res =
            await fetch("/products");

        const data =
            await res.json();

        const table =
            document.getElementById("productTable");

        if (!table) {
            return;
        }

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

    } catch (err) {

        console.error(err);
    }
}

async function loadSales() {

    try {

        const res =
            await fetch("/api/sales");

        const data =
            await res.json();

        const box =
            document.getElementById("salesList");

        if (!box) {
            return;
        }

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

        const res =
            await fetch("/api/summary");

        const resData =
            await res.json();

        const d =
            resData.data || {

                total_sales: 0,
                transactions: 0,
                top_product: "None",
                low_stock: []
            };

        const summaryBox =
            document.getElementById("summaryBox");

        if (!summaryBox) {
            return;
        }

        summaryBox.innerHTML = `

            <p>📊 Total Sales: ₱${d.total_sales}</p>

            <p>🧾 Transactions: ${d.transactions}</p>

            <p>🔥 Top Product: ${d.top_product}</p>

            <p>⚠ Low Stock (≤10):</p>

            ${(d.low_stock || [])
                .filter(p => p.stock <= 10)
                .map(p => `
                    <p>
                        - ${p.name} (${p.stock})
                    </p>
                `)
                .join("")}
        `;

    } catch (err) {

        console.error(err);
    }
}

async function deleteProduct(id) {

    if (!confirm("Delete this product?")) {
        return;
    }

    try {

        const res =
            await fetch("/delete-product", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({ id })
            });

        const data =
            await res.json();

        alert(data.message || "Deleted");

        loadProducts();

    } catch (err) {

        console.error(err);

        alert("Delete failed");
    }
}

async function addToCart(productName, quantity = 1) {

    try {

        const res =
            await fetch("/products");

        const data =
            await res.json();

        const products =
            data.data || [];

        const product =
            products.find(
                p =>
                    p.name.toLowerCase() ===
                    productName.toLowerCase()
            );

        if (!product) {

            alert("Product not found");

            return;
        }

        const existing =
            cart.find(
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

        // FIX 1: also update the dashboard cart panel after adding
        renderDashCart();

    } catch (err) {

        console.error(err);
    }
}

function renderPosPage() {
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const itemsHtml = cart.length === 0
        ? `<p class="pos-empty">Cart is empty.</p>`
        : cart.map((item, index) => {
            const subtotal = item.price * item.quantity;
            return `
            <div class="pos-cart-item">
                <div class="pos-item-info">
                    <div class="pos-item-name">${item.name}</div>
                    <div class="pos-item-price-each">₱${item.price.toFixed(2)} ea</div>
                </div>
                <div class="pos-item-right">
                    <div class="pos-qty-controls">
                        <button class="pos-qty-btn" onclick="changeQty(${index}, -1)">−</button>
                        <span class="pos-qty-num">${item.quantity}</span>
                        <button class="pos-qty-btn" onclick="changeQty(${index}, 1)">+</button>
                    </div>
                    <div class="pos-item-subtotal">₱${subtotal.toFixed(2)}</div>
                    <button class="pos-delete-btn" onclick="removeFromCart(${index})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                </div>
            </div>`;
        }).join("");
    return `
    <div class="pos-page">
        <div class="pos-cart-card">
            <div class="pos-cart-header">
                <div class="pos-cart-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    Cart <span class="cart-count-badge">${count}</span>
                </div>
                <button class="pos-clear-btn" onclick="clearCart()">Clear</button>
            </div>
            <div class="pos-cart-items">${itemsHtml}</div>
            <hr class="pos-divider">
            <div class="pos-subtotal-row">
                <span class="pos-subtotal-label">Subtotal</span>
                <span class="pos-subtotal-amount">₱${total.toFixed(2)}</span>
            </div>
            <button class="pos-checkout-btn" onclick="checkoutCart()">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                Checkout
            </button>
            <p class="pos-update-note">Update prices in Inventory</p>
        </div>
    </div>`;
}

function changeQty(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    renderCart();
    renderDashCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
    renderDashCart();
}

function clearCart() {
    if (!confirm("Clear the cart?")) return;
    cart = [];
    renderCart();
    renderDashCart();
}

function renderCart() {
    const content = document.getElementById("content");
    if (content && content.querySelector(".pos-page")) {
        content.innerHTML = renderPosPage();
    }
}

// FIX 2: checkout uses "benta" which ai_brain.py recognizes as SALE intent
// "sell" works too but "benta" is the primary keyword — using both for safety
async function checkoutCart() {

    if (cart.length === 0) {

        alert("Cart is empty");

        return;
    }

    try {

        for (const item of cart) {

            await fetch("/process-command", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    command:
                        `benta ${item.quantity} ${item.name}`
                })
            });
        }

        alert("Checkout successful!");

        cart = [];

        renderCart();
        renderDashCart();

        setTimeout(() => {
            loadProducts();
            loadSales();
            loadSummary();
            loadDashboardSummary();
        }, 300);

    } catch (err) {

        console.error(err);

        alert("Checkout failed");
    }
}

// FIX 1: renders the inline cart panel on the dashboard page
function renderDashCart() {

    const countEl = document.getElementById("dashCartCount");
    const itemsEl = document.getElementById("dashCartItems");
    const totalEl = document.getElementById("dashCartTotal");

    if (!itemsEl) return; // not on dashboard, skip silently

    const count = cart.reduce((s, i) => s + i.quantity, 0);
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

    if (countEl) countEl.textContent = count;
    if (totalEl) totalEl.textContent = `₱${total.toFixed(2)}`;

    if (cart.length === 0) {
        itemsEl.innerHTML = `<p class="pos-empty">Cart is empty.</p>`;
        return;
    }

    itemsEl.innerHTML = cart.map((item, index) => {

        const subtotal = item.price * item.quantity;

        return `
        <div class="pos-cart-item">
            <div class="pos-item-info">
                <div class="pos-item-name">${item.name}</div>
                <div class="pos-item-price-each">₱${item.price.toFixed(2)} ea</div>
            </div>
            <div class="pos-item-right">
                <div class="pos-qty-controls">
                    <button class="pos-qty-btn" onclick="changeQty(${index}, -1)">−</button>
                    <span class="pos-qty-num">${item.quantity}</span>
                    <button class="pos-qty-btn" onclick="changeQty(${index}, 1)">+</button>
                </div>
                <div class="pos-item-subtotal">₱${subtotal.toFixed(2)}</div>
                <button class="pos-delete-btn" onclick="removeFromCart(${index})">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
            </div>
        </div>`;

    }).join("");
}

showPage("dashboard");

// Set sidebar email from localStorage/sessionStorage (set by login page)
(function() {
    const el = document.getElementById("sidebarEmail");
    if (el) {
        const email = localStorage.getItem("userEmail") || sessionStorage.getItem("userEmail") || "";
        el.textContent = email || "—";
    }
})();