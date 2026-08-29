const productInput = document.getElementById('productInput');
const addProductBtn = document.getElementById('addProductBtn');
const productList = document.getElementById('productList');
const totalAmount = document.getElementById('totalAmount');
const addFeedback = document.getElementById('addFeedback');
const clearListBtn = document.getElementById('clearListBtn');

let products = [];

function loadProducts() {
    const savedProducts = localStorage.getItem('shoppingList');
    if (savedProducts) {
        products = JSON.parse(savedProducts);
        renderProducts();
        updateTotal();
    }
}

// Salvar produtos no localStorage
function saveProducts() {
    localStorage.setItem('shoppingList', JSON.stringify(products));
}

function escapeHtml(text) {
    return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function formatPrice(price) {
    return Number(price).toFixed(2).replace('.', ',');
}

function parseShoppingList(text) {
    return text
        // Também trata entidades de espaço caso tenham sido copiadas de uma página.
        .replace(/&(?:#x20|#32|nbsp);/gi, ' ')
        .split(/\r?\n/)
        .map(line => line.trim().replace(/^[-*•]\s*/, ''))
        .filter(Boolean)
        .map(line => {
            const match = line.match(/^(\d+)(?:\s*[x×]\s*|\s+)(.+)$/i);

            if (!match) {
                return { name: line, quantity: 1 };
            }

            return {
                name: match[2].trim(),
                quantity: Math.max(1, parseInt(match[1], 10))
            };
        })
        .filter(product => product.name !== '');
}

function addProducts() {
    const parsedProducts = parseShoppingList(productInput.value);

    if (parsedProducts.length === 0) {
        addFeedback.textContent = 'Digite ou cole pelo menos um produto.';
        productInput.focus();
        return;
    }

    const firstId = Date.now();
    const newProducts = parsedProducts.map((product, index) => ({
        id: firstId + index,
        name: product.name,
        quantity: product.quantity,
        price: 0,
        checked: false
    }));

    products.push(...newProducts);
    productInput.value = '';
    addFeedback.textContent = `${newProducts.length} ${newProducts.length === 1 ? 'produto adicionado' : 'produtos adicionados'}.`;

    saveProducts();
    renderProducts();
}

function renderProducts() {
    clearListBtn.disabled = products.length === 0;

    if (products.length === 0) {
        productList.innerHTML = '<div class="empty-message">Sua lista de compras está vazia. Adicione produtos acima.</div>';
        return;
    }
    
    productList.innerHTML = '';
    
    products.forEach(product => {
        const subtotal = product.quantity * product.price;
        const productItem = document.createElement('div');
        productItem.className = `product-item ${product.checked ? 'checked' : ''}`;
        productItem.innerHTML = `
            <div class="product-main">
                <input type="checkbox" class="checkbox" ${product.checked ? 'checked' : ''} data-id="${product.id}" aria-label="Marcar ${escapeHtml(product.name)} como comprado">
                <div class="product-name">${escapeHtml(product.name)}</div>
            </div>
            <div class="product-details">
                <label class="product-field quantity-field">
                    <span class="field-label">Qtd.</span>
                    <input type="number" class="product-quantity" min="1" value="${product.quantity}" data-id="${product.id}" aria-label="Quantidade de ${escapeHtml(product.name)}">
                </label>
                <label class="product-field price-field">
                    <span class="field-label">Preço</span>
                    <input type="text" inputmode="numeric" class="product-price" placeholder="0,00" value="${product.price > 0 ? formatPrice(product.price) : ''}" data-id="${product.id}" aria-label="Preço de ${escapeHtml(product.name)}">
                </label>
                <div class="product-field subtotal-field">
                    <span class="field-label">Subtotal</span>
                    <strong class="product-subtotal">R$ ${formatPrice(subtotal)}</strong>
                </div>
            </div>
            <button class="delete-btn" data-id="${product.id}">Excluir</button>
        `;
        
        productList.appendChild(productItem);
    });
    
    document.querySelectorAll('.checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', toggleProduct);
    });

    document.querySelectorAll('.product-quantity').forEach(input => {
        input.addEventListener('change', updateProductQuantity);
    });
    
    document.querySelectorAll('.product-price').forEach(input => {
        input.addEventListener('input', updateProductPrice);
    });
    
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', deleteProduct);
    });
}

function toggleProduct(event) {
    const productId = parseInt(event.target.dataset.id);
    const product = products.find(p => p.id === productId);
    
    if (product) {
        product.checked = event.target.checked;
        saveProducts();
        renderProducts();
        updateTotal();
    }
}

function updateProductQuantity(event) {
    const productId = parseInt(event.target.dataset.id);
    const product = products.find(p => p.id === productId);
    
    if (product) {
        const quantity = parseInt(event.target.value) || 1;
        product.quantity = quantity;
        saveProducts();
        renderProducts();
        updateTotal();
    }
}

function updateProductPrice(event) {
    const productId = parseInt(event.target.dataset.id);
    const product = products.find(p => p.id === productId);
    
    if (product) {
        const digits = event.target.value.replace(/\D/g, '');
        const price = digits === '' ? 0 : parseInt(digits, 10) / 100;

        product.price = price;
        event.target.value = digits === '' ? '' : formatPrice(price);

        const subtotal = product.quantity * product.price;
        const subtotalElement = event.target.closest('.product-item').querySelector('.product-subtotal');
        subtotalElement.textContent = `R$ ${formatPrice(subtotal)}`;

        saveProducts();
        updateTotal();
    }
}

function deleteProduct(event) {
    const productId = parseInt(event.target.dataset.id);
    products = products.filter(p => p.id !== productId);
    
    saveProducts();
    renderProducts();
    updateTotal();
}

function clearProductList() {
    if (products.length === 0) {
        return;
    }

    const confirmation = window.confirm(`Excluir todos os ${products.length} produtos da lista?`);

    if (!confirmation) {
        return;
    }

    products = [];
    addFeedback.textContent = 'Toda a lista foi excluída.';

    saveProducts();
    renderProducts();
    updateTotal();
}

function updateTotal() {
    const total = products
        .filter(product => product.checked)
        .reduce((sum, product) => sum + (product.quantity * product.price), 0);
    
    totalAmount.textContent = `R$ ${formatPrice(total)}`;
}

addProductBtn.addEventListener('click', addProducts);
clearListBtn.addEventListener('click', clearProductList);
productInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        addProducts();
    }
});

loadProducts();
