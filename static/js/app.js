const API = "https://vocastore-production.up.railway.app";

let cart = [];
let voiceEnabled = true;
let sidebarOpen = true;

// ─── INPUT NORMALIZATION ──────────────────────────────────────────────────────
function normalizeInput(text) {
    return text.toLowerCase().trim();
}

// ─── KEYWORD SETS ─────────────────────────────────────────────────────────────
const TOP_KEYWORDS        = ["top sales","top selling","top product","pinakamabenta","best selling","best seller","most sold","top sale"];
const LOW_STOCK_KEYWORDS  = ["low stock","kulang","ubos","kulang stock","ubos stock","mababa","mababa stock","anong kulang","alin mababa"];
const TREND_KEYWORDS      = ["sales trend","sales report","benta trend","benta ngayon","how much today","magkano ngayon","buod ngayong","sales summary"];
const ANALYTICS_KEYWORDS  = ["analytics","summary","report","kita","revenue","total sales","total sale","gaano","kabuuan","buod"];
const CHECKOUT_KEYWORDS   = ["checkout","bayad","bayaran","i-checkout","i checkout"];

function matchesAny(text, keywords) {
    const t = normalizeInput(text);
    return keywords.some(kw => t.includes(kw.toLowerCase()));
}

// ─── SIDEBAR TOGGLE ───────────────────────────────────────────────────────────
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("sidebarToggle");
    sidebarOpen = !sidebarOpen;
    if (sidebarOpen) {
        sidebar.classList.remove("sidebar-collapsed");
        if (toggleBtn) toggleBtn.innerHTML = sidebarChevronLeft();
    } else {
        sidebar.classList.add("sidebar-collapsed");
        if (toggleBtn) toggleBtn.innerHTML = sidebarChevronRight();
    }
}

function sidebarChevronLeft() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
}
function sidebarChevronRight() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
}

// ─── PAGE ROUTING ─────────────────────────────────────────────────────────────
async function showPage(page) {
    const content = document.getElementById("content");
    document.querySelectorAll(".sidebar-nav button").forEach(b => b.classList.remove("active"));
    const activeBtn = document.getElementById(`nav-${page}`);
    if (activeBtn) activeBtn.classList.add("active");

    if (page === "pos") {
        content.innerHTML = renderPosPage();
        return;
    }

    if (page === "voice-commands") {
        content.innerHTML = renderVoiceGuidePage();
        return;
    }

    try {
        const res  = await fetch(`/${page}`);
        const html = await res.text();
        content.innerHTML = html;

        if (page === "dashboard") { loadDashboardSummary(); renderDashCart(); }
        if (page === "inventory") { initInventory(); }
        if (page === "sales")     { loadSales(); }
        if (page === "summary")   { loadSummary(); }
    } catch (err) {
        console.error(err);
        content.innerHTML = `<h2>Failed to load page</h2>`;
    }
}

// ─── TTS ──────────────────────────────────────────────────────────────────────
function speak(text) {
    if (!voiceEnabled) return;
    // Cancel anything queued/speaking first — prevents silent failures
    // after the synth was cancelled during a voice toggle
    speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = "en-PH";
    // Small delay lets the cancel() flush before queuing the new utterance
    setTimeout(() => speechSynthesis.speak(msg), 120);
}

// ─── SEND COMMAND ─────────────────────────────────────────────────────────────
async function sendCommand() {
    const rawCmd = document.getElementById("command").value;
    const cmd    = normalizeInput(rawCmd);

    try {
        // ADD TO CART
        if (cmd.startsWith("add to cart") || cmd.startsWith("ilagay sa cart") || cmd.startsWith("idagdag sa cart")) {
            const cleaned = cmd
                .replace(/^(add to cart|ilagay sa cart|idagdag sa cart)\s*/i, "")
                .trim();

            const numberWords = {
                "isa":1,"isang":1,"dalawa":2,"dalawang":2,"tatlo":3,"tatlong":3,
                "apat":4,"lima":5,"limang":5,"anim":6,"pito":7,"pitong":7,
                "walo":8,"walong":8,"siyam":9,"sampu":10,"sampung":10
            };
            const parts = cleaned.split(" ");
            let quantity = parseInt(parts[0]);
            if (isNaN(quantity)) quantity = numberWords[parts[0]] || 1;
            const product = isNaN(parseInt(parts[0])) && !numberWords[parts[0]]
                ? cleaned
                : parts.slice(1).join(" ");

            await addToCart(product, quantity);
            return;
        }

        // CHECKOUT via voice
        if (matchesAny(cmd, CHECKOUT_KEYWORDS)) {
            await checkoutCart();
            return;
        }

        const summary = await fetch("/api/summary");
        const resData = await summary.json();
        const d = resData.data || {};

        // TOP SALES
        if (matchesAny(cmd, TOP_KEYWORDS)) {
            const msg = `Top selling product is ${d.top_product || "None"}`;
            document.getElementById("response").innerText = msg;
            speak(msg);
            showPopup("🔥 Top Selling Product", `
                <div class="card"><h3>${d.top_product || "None"}</h3></div>
            `);
            return;
        }

        // SALES TREND
        if (matchesAny(cmd, TREND_KEYWORDS)) {
            const msg = "Showing sales trend";
            document.getElementById("response").innerText = msg;
            speak(msg);
            showPopup("📈 Sales Trend", `
                <div class="card"><p>Total Sales</p><h1>₱${d.total_sales || 0}</h1></div>
                <div class="card"><p>Total Transactions</p><h1>${d.transactions || 0}</h1></div>
            `);
            return;
        }

        // ANALYTICS
        if (matchesAny(cmd, ANALYTICS_KEYWORDS)) {
            const msg = "Showing analytics";
            document.getElementById("response").innerText = msg;
            speak(msg);
            showPopup("📊 Store Analytics", `
                <div class="card"><b>Total Sales:</b><br>₱${d.total_sales || 0}</div>
                <div class="card"><b>Transactions:</b><br>${d.transactions || 0}</div>
                <div class="card"><b>Top Product:</b><br>${d.top_product || "None"}</div>
            `);
            return;
        }

        // LOW STOCK — check before AI so it always triggers popup
        if (matchesAny(cmd, LOW_STOCK_KEYWORDS)) {
            const msg = "Showing low stock items";
            document.getElementById("response").innerText = msg;
            speak(msg);
            const low = d.low_stock || [];
            showPopup("⚠️ Low Stock Products", low.length === 0
                ? `<p class="popup-empty">All stock levels are good!</p>`
                : low.filter(p => p.stock <= 10).map(p => `
                    <div class="card"><b>${p.name}</b><br>Remaining: ${p.stock}</div>
                `).join("") || `<p class="popup-empty">No low stock items</p>`
            );
            return;
        }

        // AI COMMAND FALLBACK
        const res  = await fetch("/process-command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command: rawCmd })
        });
        const data = await res.json();
        const msg  = data.message || "No response";

        document.getElementById("response").innerText = msg;
        speak(msg);

        // Show popup based on AI response type
        if (data.type === "analytics") {
            if (data.subtype === "low_stock") {
                showPopup("⚠️ Low Stock Products", (data.data || []).map(p => `
                    <div class="card"><b>${p.name}</b><br>Remaining: ${p.stock}</div>
                `).join("") || `<p class="popup-empty">No low stock items</p>`);
            } else if (data.subtype === "top_products") {
                showPopup("🔥 Top Selling Products", (data.data || []).map((p, i) => `
                    <div class="card"><b>#${i+1} ${p.product}</b><br>Sold: ${p.sold} &nbsp;·&nbsp; ₱${p.revenue.toFixed(2)}</div>
                `).join(""));
            } else if (data.subtype === "trend") {
                showPopup("📈 Sales Trend (Last 7 Days)", (data.data || []).map(r => `
                    <div class="card"><b>${r.date}</b><br>₱${r.sales.toFixed(2)} · ${r.count} txn</div>
                `).join(""));
            } else if (data.subtype === "summary") {
                const sd = data.data || {};
                showPopup("📊 Store Analytics", `
                    <div class="card"><b>Total Sales:</b><br>₱${sd.total_sales || 0}</div>
                    <div class="card"><b>Transactions:</b><br>${sd.transactions || 0}</div>
                    <div class="card"><b>Top Product:</b><br>${sd.top_product || "None"}</div>
                    <div class="card"><b>Today's Sales:</b><br>₱${sd.today_total || 0}</div>
                `);
            }
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

// ─── POPUP ────────────────────────────────────────────────────────────────────
function showPopup(title, bodyHtml) {
    const overlay = document.getElementById("popupOverlay");
    const titleEl = document.getElementById("popupTitle");
    const content = document.getElementById("popupContent");
    if (titleEl) titleEl.textContent = title;
    content.innerHTML = bodyHtml;
    overlay.classList.remove("hidden");
}

function closePopup(event) {
    if (!event || event.target.id === "popupOverlay" || event.target.classList.contains("close-btn")) {
        document.getElementById("popupOverlay").classList.add("hidden");
    }
}

// ─── VOICE ────────────────────────────────────────────────────────────────────
function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Voice recognition not supported"); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-PH";
    recognition.start();
    recognition.onresult = (e) => {
        document.getElementById("command").value = e.results[0][0].transcript;
        sendCommand();
    };
}

// ─── FUZZY PRODUCT MATCH ─────────────────────────────────────────────────────
function fuzzyScore(a, b) {
    // simple character overlap score
    a = a.toLowerCase(); b = b.toLowerCase();
    if (a === b) return 1;
    let matches = 0;
    const bChars = b.split("");
    for (const ch of a) {
        const idx = bChars.indexOf(ch);
        if (idx !== -1) { matches++; bChars.splice(idx, 1); }
    }
    return matches / Math.max(a.length, b.length);
}

// ─── ADD TO CART ─────────────────────────────────────────────────────────────
async function addToCart(productName, quantity = 1) {
    const responseEl = document.getElementById("response");
    try {
        const res  = await fetch("/products");
        const data = await res.json();
        const products = data.data || [];
        const search = normalizeInput(productName);

        // 1. Exact match
        let product = products.find(p => p.name.toLowerCase() === search);

        // 2. Starts-with (shortest wins)
        if (!product) {
            const matches = products.filter(p => p.name.toLowerCase().startsWith(search));
            if (matches.length) { matches.sort((a,b) => a.name.length - b.name.length); product = matches[0]; }
        }

        // 3. Contains (5+ chars, shortest wins)
        if (!product && search.length >= 3) {
            const matches = products.filter(p => p.name.toLowerCase().includes(search));
            if (matches.length) { matches.sort((a,b) => a.name.length - b.name.length); product = matches[0]; }
        }

        // 4. Fuzzy — must score > 0.55 to avoid wrong guesses
        if (!product) {
            let best = null, bestScore = 0.55;
            for (const p of products) {
                const score = fuzzyScore(search, p.name.toLowerCase());
                if (score > bestScore) { bestScore = score; best = p; }
            }
            product = best;
        }

        if (!product) {
            const notFoundMsg = `Product "${productName}" not found. Check the exact name in Inventory.`;
            if (responseEl) responseEl.innerText = notFoundMsg;
            speak(notFoundMsg);
            return;
        }

        const existing = cart.find(item => item.name.toLowerCase() === product.name.toLowerCase());
        if (existing) { existing.quantity += quantity; }
        else { cart.push({ name: product.name, price: product.price, quantity }); }

        const addedMsg = `${product.name} added to cart`;
        if (responseEl) responseEl.innerText = addedMsg;
        speak(addedMsg);
        renderCart(); renderDashCart();
    } catch (err) { console.error(err); }
}

// ─── POS PAGE ────────────────────────────────────────────────────────────────
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
    renderCart(); renderDashCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart(); renderDashCart();
}

function clearCart() {
    if (!confirm("Clear the cart?")) return;
    cart = [];
    renderCart(); renderDashCart();
}

function renderCart() {
    const content = document.getElementById("content");
    if (content && content.querySelector(".pos-page")) content.innerHTML = renderPosPage();
}

// ─── CHECKOUT ────────────────────────────────────────────────────────────────
async function checkoutCart() {
    if (cart.length === 0) { alert("Cart is empty"); return; }
    try {
        for (const item of cart) {
            await fetch("/process-command", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command: `benta ${item.quantity} ${item.name}` })
            });
        }
        const successMsg = "Checkout successful! Thank you!";
        document.getElementById("response") && (document.getElementById("response").innerText = successMsg);
        speak(successMsg);
        cart = [];
        renderCart(); renderDashCart();
        setTimeout(() => { loadProducts(); loadSales(); loadSummary(); loadDashboardSummary(); }, 300);
    } catch (err) {
        console.error(err);
        alert("Checkout failed");
    }
}

// ─── DASHBOARD CART ──────────────────────────────────────────────────────────
function renderDashCart() {
    const countEl = document.getElementById("dashCartCount");
    const itemsEl = document.getElementById("dashCartItems");
    const totalEl = document.getElementById("dashCartTotal");
    if (!itemsEl) return;

    const count = cart.reduce((s, i) => s + i.quantity, 0);
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    if (countEl) countEl.textContent = count;
    if (totalEl) totalEl.textContent = `₱${total.toFixed(2)}`;

    if (cart.length === 0) { itemsEl.innerHTML = `<p class="pos-empty">Cart is empty.</p>`; return; }
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

// ─── DATA LOADERS ────────────────────────────────────────────────────────────
async function loadDashboardSummary() {
    try {
        const res = await fetch("/api/summary");
        const resData = await res.json();
        const d = resData.data || {};

        const totalEl = document.getElementById("todayTotal");
        const countEl = document.getElementById("todayCount");
        const listEl  = document.getElementById("lowStockList");

        if (totalEl) totalEl.textContent = `₱${(d.total_sales || 0).toFixed(2)}`;
        if (countEl) countEl.textContent = `From ${d.transactions || 0} transaction${d.transactions !== 1 ? "s" : ""}`;

        if (listEl) {
            const low = d.low_stock || [];
            listEl.innerHTML = low.length === 0
                ? `<p class="no-data">All stock levels are good!</p>`
                : low.slice(0, 4).map(p => `
                    <div class="low-stock-item">
                        <span class="item-name">${p.name}</span>
                        <span class="low-stock-badge">${p.stock} left</span>
                    </div>
                `).join("");
        }

        const dashboardSummary = document.getElementById("dashboardSummary");
        if (dashboardSummary) {
            dashboardSummary.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:16px;">
                    <div class="card"><h3>Total Sales</h3><h1 style="margin-top:8px;">₱${d.total_sales || 0}</h1></div>
                    <div class="card"><h3>Transactions</h3><h1 style="margin-top:8px;">${d.transactions || 0}</h1></div>
                    <div class="card"><h3>Top Product</h3><h1 style="margin-top:8px;">${d.top_product || "None"}</h1></div>
                </div>`;
        }
    } catch (err) { console.error(err); }
}

async function loadProducts() {
    try {
        const res  = await fetch("/products");
        const data = await res.json();
        const table = document.getElementById("productTable");
        if (!table) return;
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
                        <button onclick="addToCart('${p.name}', 1)">Add To Cart</button>
                    </td>
                </tr>`;
        });
    } catch (err) { console.error(err); }
}

async function loadSales() {
    try {
        const res  = await fetch("/api/sales");
        const data = await res.json();
        const box  = document.getElementById("salesList");
        if (!box) return;
        box.innerHTML = "";
        (data.data || []).forEach(s => {
            box.innerHTML += `
                <div class="card">
                    <b>${s.product}</b><br>
                    Qty: ${s.quantity}<br>
                    Total: ₱${s.total}<br>
                    <small>${s.date}</small>
                </div>`;
        });
    } catch (err) { console.error(err); }
}

async function loadSummary() {
    try {
        const res     = await fetch("/api/summary");
        const resData = await res.json();
        const d = resData.data || { total_sales: 0, transactions: 0, top_product: "None", low_stock: [] };
        const summaryBox = document.getElementById("summaryBox");
        if (!summaryBox) return;
        summaryBox.innerHTML = `
            <p>📊 Total Sales: ₱${d.total_sales}</p>
            <p>🧾 Transactions: ${d.transactions}</p>
            <p>🔥 Top Product: ${d.top_product}</p>
            <p>⚠ Low Stock (≤10):</p>
            ${(d.low_stock || []).filter(p => p.stock <= 10).map(p => `<p>- ${p.name} (${p.stock})</p>`).join("")}`;
    } catch (err) { console.error(err); }
}

async function deleteProduct(id) {
    if (!confirm("Delete this product?")) return;
    try {
        const res  = await fetch("/delete-product", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
        });
        const data = await res.json();
        alert(data.message || "Deleted");
        loadProducts();
    } catch (err) { console.error(err); alert("Delete failed"); }
}

// ─── VOICE GUIDE PAGE ────────────────────────────────────────────────────────
function renderVoiceGuidePage() {
    return `
    <div class="voice-guide-page">
        <div class="voice-guide-header">
            <div class="vg-icon">🎙️</div>
            <div>
                <h1>Voice Commands</h1>
                <p>Lahat ng pwedeng utusan kay VocaStore. Pwede sa Tagalog, Taglish, o English.</p>
            </div>
        </div>

        <div class="vg-search-wrap">
            <input id="vgSearch" class="vg-search" placeholder="Hanapin: 'benta', 'low stock', 'analytics'..."
                oninput="filterVoiceGuide(this.value)" />
        </div>

        <div id="vgCards" class="vg-sections">

            <div class="vg-section-label">BENTA &amp; STOCK</div>
            <div class="vg-grid">
                <div class="vg-card" data-tags="benta sale sell sold">
                    <div class="vg-card-top">
                        <span class="vg-card-title">Benta (Sale)</span>
                        <span class="vg-badge vg-badge-sale">SALE</span>
                    </div>
                    <p class="vg-card-desc">I-record ang benta. Pwede multi-item.</p>
                    <div class="vg-examples">
                        <div class="vg-example">"Benta 1 Coke at 2 Sprite"</div>
                        <div class="vg-example">"Naka benta ako ng limang Coke"</div>
                        <div class="vg-example">"Sold 3 Lucky Me"</div>
                        <div class="vg-example">"Bumili ng 2 Bear Brand"</div>
                    </div>
                </div>
                <div class="vg-card" data-tags="dagdag restock add stock">
                    <div class="vg-card-top">
                        <span class="vg-card-title">Dagdag Stock (Restock)</span>
                        <span class="vg-badge vg-badge-restock">RESTOCK</span>
                    </div>
                    <p class="vg-card-desc">Magdagdag ng stock sa existing product.</p>
                    <div class="vg-examples">
                        <div class="vg-example">"Dagdag sampung Pepsi"</div>
                        <div class="vg-example">"Restock 20 bigas"</div>
                        <div class="vg-example">"Add 15 Marlboro"</div>
                    </div>
                </div>
                <div class="vg-card" data-tags="check stock ilan tingnan how many">
                    <div class="vg-card-top">
                        <span class="vg-card-title">Tingin ng Stock</span>
                        <span class="vg-badge vg-badge-check">CHECK_STOCK</span>
                    </div>
                    <p class="vg-card-desc">Itanong ang natitirang stock.</p>
                    <div class="vg-examples">
                        <div class="vg-example">"Ilan stock ng Coke"</div>
                        <div class="vg-example">"How many Sprite left"</div>
                        <div class="vg-example">"Tingin Bear Brand"</div>
                    </div>
                </div>
                <div class="vg-card" data-tags="low stock kulang ubos mababa">
                    <div class="vg-card-top">
                        <span class="vg-card-title">Mababang Stock</span>
                        <span class="vg-badge vg-badge-low">LOW_STOCK</span>
                    </div>
                    <p class="vg-card-desc">Listahan ng paninda na mababa na.</p>
                    <div class="vg-examples">
                        <div class="vg-example">"Alin mababa stock"</div>
                        <div class="vg-example">"Low stock"</div>
                        <div class="vg-example">"Anong kulang"</div>
                    </div>
                </div>
            </div>

            <div class="vg-section-label">PRODUKTO</div>
            <div class="vg-grid">
                <div class="vg-card" data-tags="new product add bagong produkto price pesos stock">
                    <div class="vg-card-top">
                        <span class="vg-card-title">Bagong Produkto</span>
                        <span class="vg-badge vg-badge-add">ADD_PRODUCT</span>
                    </div>
                    <p class="vg-card-desc">Magdagdag ng bagong item sa imbentaryo.</p>
                    <div class="vg-examples">
                        <div class="vg-example">"Magdagdag ng produkto Milo 20 pesos 50 stock"</div>
                        <div class="vg-example">"New product Skyflakes 12 pesos 30 stock"</div>
                        <div class="vg-example">"New Marlboro Red price 15 stock 100"</div>
                    </div>
                </div>
                <div class="vg-card" data-tags="add to cart cart ilagay">
                    <div class="vg-card-top">
                        <span class="vg-card-title">Add to Cart</span>
                        <span class="vg-badge vg-badge-cart">CART</span>
                    </div>
                    <p class="vg-card-desc">Idagdag sa cart bago mag-checkout.</p>
                    <div class="vg-examples">
                        <div class="vg-example">"Add to cart 2 Coke"</div>
                        <div class="vg-example">"Add to cart Marlboro"</div>
                        <div class="vg-example">"Ilagay sa cart 3 Sprite"</div>
                    </div>
                </div>
                <div class="vg-card" data-tags="checkout bayad bayaran">
                    <div class="vg-card-top">
                        <span class="vg-card-title">Checkout</span>
                        <span class="vg-badge vg-badge-checkout">CHECKOUT</span>
                    </div>
                    <p class="vg-card-desc">I-process ang lahat ng items sa cart.</p>
                    <div class="vg-examples">
                        <div class="vg-example">"Checkout"</div>
                        <div class="vg-example">"Bayaran na"</div>
                        <div class="vg-example">"I-checkout"</div>
                    </div>
                </div>
            </div>

            <div class="vg-section-label">ANALYTICS</div>
            <div class="vg-grid">
                <div class="vg-card" data-tags="top sales top selling pinakamabenta best seller">
                    <div class="vg-card-top">
                        <span class="vg-card-title">Top Sales</span>
                        <span class="vg-badge vg-badge-analytics">TOP_SALES</span>
                    </div>
                    <p class="vg-card-desc">Pinakamabentang produkto ngayon / linggo / buwan.</p>
                    <div class="vg-examples">
                        <div class="vg-example">"Top sales today"</div>
                        <div class="vg-example">"Top sales this week"</div>
                        <div class="vg-example">"Ano pinakamabenta ngayong buwan"</div>
                    </div>
                </div>
                <div class="vg-card" data-tags="analytics summary report revenue kita kabuuan">
                    <div class="vg-card-top">
                        <span class="vg-card-title">Analytics</span>
                        <span class="vg-badge vg-badge-analytics">ANALYTICS</span>
                    </div>
                    <p class="vg-card-desc">Buod ng benta at transactions.</p>
                    <div class="vg-examples">
                        <div class="vg-example">"Analytics today"</div>
                        <div class="vg-example">"Buod ngayong linggo"</div>
                        <div class="vg-example">"Sales summary month"</div>
                    </div>
                </div>
                <div class="vg-card" data-tags="sales trend benta ngayon report magkano">
                    <div class="vg-card-top">
                        <span class="vg-card-title">Sales Trend</span>
                        <span class="vg-badge vg-badge-analytics">TREND</span>
                    </div>
                    <p class="vg-card-desc">Tingnan ang trend ng benta sa nakaraang linggo.</p>
                    <div class="vg-examples">
                        <div class="vg-example">"Sales trend"</div>
                        <div class="vg-example">"Benta ngayon"</div>
                        <div class="vg-example">"Sales report"</div>
                    </div>
                </div>
            </div>

        </div>

        <div class="vg-tip">
            <span class="vg-tip-icon">💡</span>
            <span><b>Tip:</b> 
            Kung walang presyo (₱0) ang produkto, hindi pwedeng ibenta. Mag-set muna ng presyo sa Imbentaryo.<br><br>
            The above products is just an example. You can use any product name in your commands as long as it exists in your inventory.
            </span>
        </div>
    </div>`;
}

function filterVoiceGuide(query) {
    const q = query.toLowerCase().trim();
    document.querySelectorAll(".vg-card").forEach(card => {
        const tags = card.getAttribute("data-tags") || "";
        const text = card.textContent.toLowerCase();
        card.style.display = (!q || tags.includes(q) || text.includes(q)) ? "" : "none";
    });
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
showPage("dashboard");

(function() {
    const el = document.getElementById("sidebarEmail");
    if (el) {
        const email = localStorage.getItem("userEmail") || sessionStorage.getItem("userEmail") || "";
        el.textContent = email || "—";
    }
})();