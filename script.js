const productInput = document.getElementById('productInput');
const addProductBtn = document.getElementById('addProductBtn');
const productList = document.getElementById('productList');
const totalAmount = document.getElementById('totalAmount');

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

function addProduct() {
    const productName = productInput.value.trim();
    
    if (productName === '') {
        alert('Por favor, digite o nome do produto.');
        return;
    }
    
    const newProduct = {
        id: Date.now(),
        name: productName,
        quantity: 1,
        price: 0,
        checked: false
    };
    
    products.push(newProduct);
    productInput.value = '';
    
    saveProducts();
    renderProducts();
}

function renderProducts() {
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
            <input type="checkbox" class="checkbox" ${product.checked ? 'checked' : ''} data-id="${product.id}">
            <div class="product-name">${product.name}</div>
            <input type="number" class="product-quantity" min="1" value="${product.quantity}" data-id="${product.id}">
            <input type="number" class="product-price" placeholder="R$ 0,00" min="0" step="0.01" value="${product.price > 0 ? product.price.toFixed(2) : ''}" data-id="${product.id}">
            <div class="product-subtotal">R$ ${subtotal.toFixed(2)}</div>
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
        input.addEventListener('change', updateProductPrice);
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
        const price = parseFloat(event.target.value) || 0;
        product.price = price;
        saveProducts();
        renderProducts();
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

function updateTotal() {
    const total = products
        .filter(product => product.checked)
        .reduce((sum, product) => sum + (product.quantity * product.price), 0);
    
    totalAmount.textContent = `R$ ${total.toFixed(2)}`;
}

addProductBtn.addEventListener('click', addProduct);
productInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        addProduct();
    }
});

loadProducts();