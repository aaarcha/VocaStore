let isListening = false;

function toggleVoiceOutput() {
    voiceEnabled = !voiceEnabled;
    // Cancel any stale/queued utterances so synth resets cleanly
    speechSynthesis.cancel();
    const btn = document.getElementById("voiceToggleBtn");
    if (!btn) return;
    btn.innerHTML = voiceEnabled
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Voice ON`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg> Voice OFF`;
}

function handleMicClick() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Voice not supported on this browser."); return; }

    const btn   = document.getElementById("micBtn");
    const label = document.getElementById("micLabel");
    if (isListening) return;

    isListening = true;
    btn.classList.add("listening");
    label.textContent = "LISTENING...";

    const recognition = new SpeechRecognition();
    recognition.lang = "en-PH";
    recognition.start();

    recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        const input = document.getElementById("command");
        if (input) input.value = transcript;
        sendCommand();
    };

    recognition.onend = () => {
        isListening = false;
        btn.classList.remove("listening");
        label.textContent = "SPEAK";
    };

    recognition.onerror = () => {
        isListening = false;
        btn.classList.remove("listening");
        label.textContent = "SPEAK";
    };
}

async function loadDashboardSummary() {
    try {
        const res  = await fetch("/api/summary");
        const data = await res.json();
        const d    = data.data || {};

        const totalEl = document.getElementById("todayTotal");
        const countEl = document.getElementById("todayCount");
        const listEl  = document.getElementById("lowStockList");

        if (totalEl) totalEl.textContent = `₱${(d.total_sales || 0).toFixed(2)}`;
        if (countEl) countEl.textContent = `From ${d.transactions || 0} transaction${d.transactions !== 1 ? 's' : ''}`;

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
    } catch (err) {
        console.error("Dashboard summary error:", err);
    }
}

// Re-render the inline dashboard cart whenever cart changes
function renderDashCart() {
    const countEl = document.getElementById("dashCartCount");
    const itemsEl = document.getElementById("dashCartItems");
    const totalEl = document.getElementById("dashCartTotal");

    if (!itemsEl) return; // not on dashboard

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