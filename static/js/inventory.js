// ── Debounce helper ───────────────────────────────────────────────────────────
function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

// FIX: replaced module-level inventoryInitialized flag with a DOM-node marker.
// The old flag stayed "true" after showPage() replaced innerHTML, so every
// second navigation to Inventory silently skipped re-binding listeners on the
// fresh DOM — buttons did nothing. Storing the guard on the node itself means
// the check is always scoped to the current DOM instance.
function initInventory() {
    const productList          = document.getElementById("productList");
    const searchInput          = document.getElementById("searchInput");
    const productFormContainer = document.getElementById("productFormContainer");
    const formTitle            = document.querySelector("#productFormContainer .form-top h2");
    const productName          = document.getElementById("productName");
    const productPrice         = document.getElementById("productPrice");
    const productStock         = document.getElementById("productStock");
    const productImage         = document.getElementById("productImage");
    const showAddFormBtn       = document.getElementById("showAddFormBtn");
    const closeFormBtn         = document.getElementById("closeFormBtn");
    const saveProductBtn       = document.getElementById("saveProductBtn");

    if (!productList || !searchInput || !showAddFormBtn || !saveProductBtn) return;

    // Guard: if this exact DOM node is already initialised, only refresh data
    if (productList._inventoryBound) {
        fetchProducts();
        return;
    }
    productList._inventoryBound = true;

    // Expose fetchProducts so app.js refreshVisiblePage() can call it
    window._fetchInventoryProducts = fetchProducts;

    let products = [];

    // ── Helpers ───────────────────────────────────────────────────────────────
    function getStockStatus(stock) {
        return stock <= 5 ? "Low stock" : "Stock available";
    }

    function openForm(mode = "add", product = null) {
        if (formTitle) formTitle.textContent = mode === "edit" ? "Edit Product" : "Add Product";

        if (mode === "edit" && product) {
            productName.value  = product.name;
            productPrice.value = product.price;
            productStock.value = product.stock;
            saveProductBtn.dataset.editId    = product.id;
            saveProductBtn.dataset.editImage = product.image || "";
        } else {
            productName.value  = "";
            productPrice.value = "";
            productStock.value = "";
            if (productImage) productImage.value = "";
            delete saveProductBtn.dataset.editId;
            delete saveProductBtn.dataset.editImage;
        }
        productFormContainer.classList.remove("hidden");
        productName.focus();
    }

    function closeForm() {
        productFormContainer.classList.add("hidden");
        delete saveProductBtn.dataset.editId;
        delete saveProductBtn.dataset.editImage;
        if (formTitle) formTitle.textContent = "Add Product";
        // FIX: clear file input reliably
        if (productImage) productImage.value = "";
    }

    // ── Render ────────────────────────────────────────────────────────────────
    function renderProducts(filteredProducts = products) {
        productList.innerHTML = "";

        if (filteredProducts.length === 0) {
            productList.innerHTML = `<div class="product-card" style="grid-column:1/-1;text-align:center;padding:32px;color:#aaa;">No products found.</div>`;
            return;
        }

        filteredProducts.forEach((product) => {
            const card = document.createElement("div");
            card.className = "product-card";
            const isLow = product.stock <= 5;

            card.innerHTML = `
                <img
                    class="product-image"
                    src="${product.image || 'https://placehold.co/300x180/f5e6d3/c47a3a?text=No+Image'}"
                    alt="${escapeHtml(product.name)}"
                    loading="lazy"
                    onerror="this.src='https://placehold.co/300x180/f5e6d3/c47a3a?text=No+Image'"
                >
                <div class="product-top">
                    <div>
                        <div class="product-name">${escapeHtml(product.name)}</div>
                        <div class="product-price">₱${Number(product.price).toFixed(2)}</div>
                    </div>
                    <div class="stock-box">
                        <div class="stock-number">${product.stock}</div>
                        <div class="stock-label">PCS</div>
                    </div>
                </div>
                <div class="stock-status${isLow ? ' low' : ''}">${getStockStatus(product.stock)}</div>
                <div class="product-buttons">
                    <button class="minus-btn" title="Remove 1">−</button>
                    <button class="add-btn" title="Add 1">+ Add</button>
                    <button class="edit-btn" title="Edit product">✎</button>
                    <button class="delete-btn" title="Delete product">🗑</button>
                </div>
            `;

            // Debounced save: UI updates instantly, DB write fires 400ms after last click
            const debouncedSave = debounce(() => updateProductInDB(product), 400);

            card.querySelector(".minus-btn").addEventListener("click", () => {
                if (product.stock <= 0) return;
                product.stock--;
                updateStockDisplay(card, product.stock);
                debouncedSave();
            });

            card.querySelector(".add-btn").addEventListener("click", () => {
                product.stock++;
                updateStockDisplay(card, product.stock);
                debouncedSave();
            });

            card.querySelector(".delete-btn").addEventListener("click", async () => {
                if (!confirm(`Delete "${product.name}"?`)) return;
                card.style.opacity = "0.4";
                card.style.pointerEvents = "none";
                try {
                    const res = await fetch("/delete-product", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: product.id })
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    await fetchProducts();
                } catch (err) {
                    console.error("Delete failed:", err);
                    card.style.opacity = "";
                    card.style.pointerEvents = "";
                    alert("Failed to delete product.");
                }
            });

            card.querySelector(".edit-btn").addEventListener("click", () => {
                openForm("edit", product);
            });

            productList.appendChild(card);
        });
    }

    // FIX: extracted into helper to avoid duplicated DOM queries in ± handlers
    function updateStockDisplay(card, stock) {
        card.querySelector(".stock-number").textContent = stock;
        const statEl = card.querySelector(".stock-status");
        statEl.textContent = getStockStatus(stock);
        statEl.className   = "stock-status" + (stock <= 5 ? " low" : "");
    }

    function getCurrentFilter() {
        const value = searchInput.value.toLowerCase().trim();
        return value ? products.filter(p => p.name.toLowerCase().includes(value)) : products;
    }

    // ── DB helpers ────────────────────────────────────────────────────────────
    async function updateProductInDB(product) {
        try {
            const res = await fetch("/update-product", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: product.id, name: product.name,
                    price: product.price, stock: product.stock,
                    image: product.image || ""
                })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            // Keep global productCache in sync
            if (typeof productCache !== "undefined") productCache = [...products];
        } catch (err) {
            console.error("Failed to update product:", err);
            // Re-fetch to restore correct state after a failed write
            fetchProducts();
        }
    }

    async function fetchProducts() {
        try {
            if (productList.children.length === 0) {
                productList.innerHTML = `<p style="color:#bbb;padding:20px;grid-column:1/-1;">Loading...</p>`;
            }
            const res  = await fetch("/products");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            products   = data.data || [];
            renderProducts(getCurrentFilter());
            // Keep global productCache in sync
            if (typeof productCache !== "undefined") productCache = [...products];
        } catch (err) {
            console.error("Failed to fetch products:", err);
            productList.innerHTML = `<div class="product-card" style="grid-column:1/-1;text-align:center;color:#e05500;padding:32px;">Failed to load products. Check connection.</div>`;
        }
    }

    // ── Event listeners (bound ONCE per DOM instance) ─────────────────────────
    showAddFormBtn.addEventListener("click", () => openForm("add"));
    closeFormBtn.addEventListener("click",   () => closeForm());

    productFormContainer.addEventListener("click", (e) => {
        if (e.target === productFormContainer) closeForm();
    });

    // FIX: prevent double-save by checking if a save is already in flight
    let _saving = false;
    saveProductBtn.addEventListener("click", async () => {
        if (_saving) return;
        const name   = productName.value.trim();
        const price  = productPrice.value.trim();
        const stock  = productStock.value.trim();
        const image  = productImage ? productImage.files[0] : null;
        const editId = saveProductBtn.dataset.editId;

        if (!name || price === "" || stock === "") {
            alert("Please fill in Name, Price, and Stock.");
            return;
        }

        // FIX: validate numeric fields before sending
        if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
            alert("Price must be a valid positive number.");
            return;
        }
        if (isNaN(parseInt(stock)) || parseInt(stock) < 0) {
            alert("Stock must be a valid non-negative number.");
            return;
        }

        _saving = true;
        saveProductBtn.textContent = "Saving...";
        saveProductBtn.disabled    = true;

        try {
            if (editId) {
                let imagePath = saveProductBtn.dataset.editImage || "";
                if (image) {
                    // Upload image only — do NOT call /add-product (causes duplicate key error)
                    const fd = new FormData();
                    fd.append("image", image);
                    const r = await fetch("/upload-image", { method: "POST", body: fd });
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    const d = await r.json();
                    if (d.image) imagePath = d.image;
                }
                const res = await fetch("/update-product", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: parseInt(editId), name,
                        price: parseFloat(price), stock: parseInt(stock),
                        image: imagePath
                    })
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
            } else {
                const fd = new FormData();
                fd.append("name", name);
                fd.append("price", price);
                fd.append("stock", stock);
                if (image) fd.append("image", image);
                const res = await fetch("/add-product", { method: "POST", body: fd });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
            }

            closeForm();
            await fetchProducts();
        } catch (err) {
            console.error("Save product error:", err);
            alert("Failed to save product. Please try again.");
        } finally {
            _saving = false;
            saveProductBtn.textContent = "Save Product";
            saveProductBtn.disabled    = false;
        }
    });

    const debouncedSearch = debounce(() => renderProducts(getCurrentFilter()), 200);
    searchInput.addEventListener("input", debouncedSearch);

    // ── Initial load ──────────────────────────────────────────────────────────
    fetchProducts();
}

// ── XSS helper ────────────────────────────────────────────────────────────────
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}