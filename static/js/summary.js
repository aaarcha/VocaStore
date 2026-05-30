async function loadSummary() {
    try {
        // ── Fetch both endpoints in PARALLEL (was 3 sequential fetches before) ──
        const [summaryRes, salesRes] = await Promise.all([
            fetch("/api/summary"),
            fetch("/api/sales")
        ]);
        const summaryData = await summaryRes.json();
        const salesData   = await salesRes.json();

        const d    = summaryData.data || {};
        const rows = salesData.data   || [];

        // ── Today & week sales (computed from the single /api/sales fetch) ──
        const todaySalesEl = document.getElementById("todaySales");
        const todayTxEl    = document.getElementById("todayTxCount");
        const weekSalesEl  = document.getElementById("weekSales");

        let todayTotal = 0, todayCount = 0, weekTotal = 0;
        const now      = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const weekAgo  = new Date(now); weekAgo.setDate(now.getDate() - 7);

        rows.forEach(r => {
            const rd = new Date(r.date);
            if (rd.toISOString().slice(0, 10) === todayStr) {
                todayTotal += parseFloat(r.total);
                todayCount++;
            }
            if (rd >= weekAgo) weekTotal += parseFloat(r.total);
        });

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

        // ── Top products (reuse rows already fetched above — no second fetch) ──
        const topEl = document.getElementById("topProductList");
        if (topEl) {
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