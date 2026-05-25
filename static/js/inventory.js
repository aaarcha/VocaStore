let products = [];

function initInventory() {

    const productList         = document.getElementById("productList");
    const searchInput         = document.getElementById("searchInput");
    const productFormContainer = document.getElementById("productFormContainer");
    const productName         = document.getElementById("productName");
    const productPrice        = document.getElementById("productPrice");
    const productStock        = document.getElementById("productStock");
    const productImage        = document.getElementById("productImage");
    const showAddFormBtn      = document.getElementById("showAddFormBtn");
    const closeFormBtn        = document.getElementById("closeFormBtn");
    const saveProductBtn      = document.getElementById("saveProductBtn");

    if (!productList || !searchInput || !showAddFormBtn || !saveProductBtn) {
        return;
    }

    function getStockStatus(stock) {
        return stock <= 5 ? "Low stock" : "Stock available";
    }

    function renderProducts(filteredProducts = products) {

        productList.innerHTML = "";

        if (filteredProducts.length === 0) {
            productList.innerHTML = `
                <div class="product-card">
                    <h2>No products found</h2>
                </div>
            `;
            return;
        }

        filteredProducts.forEach((product) => {

            const card = document.createElement("div");
            card.className = "product-card";

            card.innerHTML = `
                <img
                    class="product-image"
                    src="${product.image || 'https://via.placeholder.com/300x180'}"
                    alt="${product.name}"
                    onerror="this.src='https://via.placeholder.com/300x180'"
                >

                <div class="product-top">
                    <div>
                        <div class="product-name">${product.name}</div>
                        <div class="product-price">₱${Number(product.price).toFixed(2)}</div>
                    </div>
                    <div class="stock-box">
                        <div class="stock-number">${product.stock}</div>
                        <div class="stock-label">PCS</div>
                    </div>
                </div>

                <div class="stock-status">
                    ${getStockStatus(product.stock)}
                </div>

                <div class="product-buttons">
                    <button class="minus-btn">−</button>
                    <button class="add-btn">+ Add</button>
                    <button class="edit-btn">✎</button>
                    <button class="delete-btn">🗑</button>
                </div>
            `;

            card.querySelector(".minus-btn").addEventListener("click", async () => {
                if (product.stock <= 0) return;
                product.stock--;
                await updateProductInDB(product);
                renderProducts(getCurrentFilter());
            });

            // FIX: add button — save new stock to the database, not localStorage
            card.querySelector(".add-btn").addEventListener("click", async () => {
                product.stock++;
                await updateProductInDB(product);
                renderProducts(getCurrentFilter());
            });

            card.querySelector(".delete-btn").addEventListener("click", async () => {
                if (!confirm("Delete this product?")) return;
                await fetch("/delete-product", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: product.id })
                });
                await fetchProducts();
            });

            card.querySelector(".edit-btn").addEventListener("click", () => {
                productName.value  = product.name;
                productPrice.value = product.price;
                productStock.value = product.stock;
                // Store the id being edited so Save knows to update, not insert
                saveProductBtn.dataset.editId    = product.id;
                saveProductBtn.dataset.editImage = product.image || "";
                productFormContainer.classList.remove("hidden");
                productFormContainer.classList.add("active");
            });

            productList.appendChild(card);
        });
    }

    function getCurrentFilter() {
        const value = searchInput.value.toLowerCase().trim();
        if (!value) return products;
        return products.filter(p => p.name.toLowerCase().includes(value));
    }

    async function updateProductInDB(product) {
        try {
            await fetch("/update-product", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id:    product.id,
                    name:  product.name,
                    price: product.price,
                    stock: product.stock,
                    image: product.image || ""
                })
            });
        } catch (err) {
            console.error("Failed to update product:", err);
        }
    }

    async function fetchProducts() {
        try {
            const res  = await fetch("/products");
            const data = await res.json();
            products   = data.data || [];
            renderProducts(getCurrentFilter());
        } catch (err) {
            console.error("Failed to fetch products:", err);
            productList.innerHTML = `<div class="product-card"><h2>Failed to load products</h2></div>`;
        }
    }

    showAddFormBtn.addEventListener("click", () => {
        // Clear any leftover edit state
        delete saveProductBtn.dataset.editId;
        delete saveProductBtn.dataset.editImage;
        productName.value  = "";
        productPrice.value = "";
        productStock.value = "";
        productFormContainer.classList.remove("hidden");
        productFormContainer.classList.add("active");
    });

    closeFormBtn.addEventListener("click", () => {
        productFormContainer.classList.remove("active");
        productFormContainer.classList.add("hidden");
        delete saveProductBtn.dataset.editId;
    });

    saveProductBtn.addEventListener("click", async () => {

        const name  = productName.value.trim();
        const price = productPrice.value;
        const stock = productStock.value;
        const image = productImage.files[0];
        const editId = saveProductBtn.dataset.editId;

        if (!name || !price || !stock) {
            alert("Please fill in all fields.");
            return;
        }

        try {
            if (editId) {
                let imagePath = saveProductBtn.dataset.editImage || "";

                if (image) {
                    const formData = new FormData();
                    formData.append("name",  name);
                    formData.append("price", price);
                    formData.append("stock", stock);
                    formData.append("image", image);
                    const res  = await fetch("/add-product", { method: "POST", body: formData });
                    const data = await res.json();
                }

                await fetch("/update-product", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id:    parseInt(editId),
                        name:  name,
                        price: parseFloat(price),
                        stock: parseInt(stock),
                        image: imagePath
                    })
                });

            } else {
                const formData = new FormData();
                formData.append("name",  name);
                formData.append("price", price);
                formData.append("stock", stock);
                if (image) formData.append("image", image);

                await fetch("/add-product", { method: "POST", body: formData });
            }

            // Reset form
            productName.value  = "";
            productPrice.value = "";
            productStock.value = "";
            delete saveProductBtn.dataset.editId;
            delete saveProductBtn.dataset.editImage;
            productFormContainer.classList.remove("active");
            productFormContainer.classList.add("hidden");

            await fetchProducts();

        } catch (err) {
            console.error(err);
            alert("Failed to save product.");
        }
    });

    searchInput.addEventListener("input", () => {
        renderProducts(getCurrentFilter());
    });

    fetchProducts();
}