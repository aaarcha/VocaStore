async function loadSales() {
    const list = document.getElementById("salesList");
    if (!list) return;
    list.innerHTML = `<p class="sales-empty">Loading...</p>`;

    try {
        const res  = await fetch("/api/sales");
        const data = await res.json();
        const rows = data.data || [];

        if (rows.length === 0) {
            list.innerHTML = `<p class="sales-empty">Wala pang benta.</p>`;
            return;
        }

        list.innerHTML = rows.map(s => {
            const date   = new Date(s.date);
            const valid  = !isNaN(date.getTime());
            const label  = valid
                ? date.toLocaleDateString("en-PH", { month: "short", day: "numeric" })
                  + ", " + date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })
                : s.date;

            return `
            <div class="sale-row">
                <div class="sale-arrow">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                        fill="none" stroke="#e87a2f" stroke-width="2.5"
                        stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <polyline points="19 12 12 19 5 12"/>
                    </svg>
                </div>
                <div class="sale-info">
                    <div class="sale-product">${s.product}</div>
                    <div class="sale-meta">
                        <span class="sale-qty">${s.quantity}x</span>
                        <span class="sale-date-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                viewBox="0 0 24 24" fill="none" stroke="#a07050"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            ${label}
                        </span>
                    </div>
                </div>
                <div class="sale-amount">₱${parseFloat(s.total).toFixed(2)}</div>
            </div>`;
        }).join("");

    } catch (err) {
        console.error(err);
        list.innerHTML = `<p class="sales-empty">Hindi ma-load ang benta.</p>`;
    }
}
