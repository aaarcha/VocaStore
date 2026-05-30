async function loadSummary() {
    try {
        const res  = await fetch("/api/summary");
        const data = await res.json();
        const d    = data.data || {};

        // ── Today & week sales ──────────────────────────────
        const todaySalesEl  = document.getElementById("todaySales");
        const todayTxEl     = document.getElementById("todayTxCount");
        const weekSalesEl   = document.getElementById("weekSales");

        // Pull today + week from analytics endpoint if available
        let todayTotal = 0, todayCount = 0, weekTotal = 0;
        try {
            const tRes  = await fetch("/api/sales");
            const tData = await tRes.json();
            const rows  = tData.data || [];

            const now       = new Date();
            const todayStr  = now.toISOString().slice(0, 10);
            const weekAgo   = new Date(now); weekAgo.setDate(now.getDate() - 7);

            rows.forEach(r => {
                const d = new Date(r.date);
                if (d.toISOString().slice(0, 10) === todayStr) {
                    todayTotal += parseFloat(r.total);
                    todayCount++;
                }
                if (d >= weekAgo) weekTotal += parseFloat(r.total);
            });
        } catch (_) {}

        if (todaySalesEl) todaySalesEl.textContent = `₱${todayTotal.toFixed(2)}`;
        if (todayTxEl)    todayTxEl.textContent    = `${todayCount} transaction${todayCount !== 1 ? "s" : ""}`;
        if (weekSalesEl)  weekSalesEl.textContent  = `₱${weekTotal.toFixed(2)}`;

        // ── Voca message ────────────────────────────────────
        const vocaEl = document.getElementById("vocaText");
        if (vocaEl) {
            if (todayCount === 0) {
                vocaEl.textContent = '"Wala pang benta ngayon. Handa na kayo para sa mga customers!"';
            } else if (todayTotal >= 1000) {
                vocaEl.textContent = `"Magaling! ₱${todayTotal.toFixed(2)} na ang kita ngayon. Tuloy lang!"`;
            } else {
                vocaEl.textContent = `"May ${todayCount} benta na ngayon. Kaya pa, tuloy lang!"`;
            }
        }

        // ── Top products ────────────────────────────────────
        const topEl = document.getElementById("topProductList");
        if (topEl) {
            try {
                const tRes  = await fetch("/api/sales");
                const tData = await tRes.json();
                const rows  = tData.data || [];

                const totals = {};
                rows.forEach(r => {
                    if (!totals[r.product]) totals[r.product] = { sold: 0, revenue: 0 };
                    totals[r.product].sold    += r.quantity;
                    totals[r.product].revenue += parseFloat(r.total);
                });

                const sorted = Object.entries(totals)
                    .sort((a, b) => b[1].sold - a[1].sold)
                    .slice(0, 5);

                topEl.innerHTML = sorted.length === 0
                    ? `<p class="no-data-text">Wala pang datos ng benta.</p>`
                    : sorted.map(([name, v]) => `
                        <div class="top-product-row">
                            <div>
                                <div class="top-product-name">${name}</div>
                                <div class="top-product-sold">${v.sold} nabenta</div>
                            </div>
                            <div class="top-product-revenue">₱${v.revenue.toFixed(2)}</div>
                        </div>
                    `).join("");
            } catch (_) {
                topEl.innerHTML = `<p class="no-data-text">Wala pang datos ng benta.</p>`;
            }
        }

        // ── Low stock ───────────────────────────────────────
        const lowEl = document.getElementById("lowStockSummary");
        if (lowEl) {
            const low = d.low_stock || [];
            lowEl.innerHTML = low.length === 0
                ? `<p class="no-data-text">All stocks are good!</p>`
                : low.map(p => `
                    <div class="low-stock-row">
                        <span class="low-stock-name">${p.name}</span>
                        <span class="low-stock-count">${p.stock} naiwan</span>
                    </div>
                `).join("");
        }

    } catch (err) {
        console.error("Summary load error:", err);
    }
}
