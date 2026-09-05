const productInput = document.getElementById('productInput');
const addProductBtn = document.getElementById('addProductBtn');
const productList = document.getElementById('productList');
const totalAmount = document.getElementById('totalAmount');
const addFeedback = document.getElementById('addFeedback');
const clearListBtn = document.getElementById('clearListBtn');
const pricePhotoInput = document.getElementById('pricePhotoInput');
const ocrModal = document.getElementById('ocrModal');
const ocrModalTitle = document.getElementById('ocrModalTitle');
const ocrStatus = document.getElementById('ocrStatus');
const ocrPrices = document.getElementById('ocrPrices');
const closeOcrModalBtn = document.getElementById('closeOcrModalBtn');

let products = [];
let ocrTargetProductId = null;
let ocrBusy = false;

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
                    <span class="price-input-group">
                        <input type="text" inputmode="numeric" class="product-price" placeholder="0,00" value="${product.price > 0 ? formatPrice(product.price) : ''}" data-id="${product.id}" aria-label="Preço de ${escapeHtml(product.name)}">
                        <button type="button" class="scan-price-btn" data-id="${product.id}" aria-label="Ler preço de ${escapeHtml(product.name)} pela foto" title="Ler preço pela foto">📷</button>
                    </span>
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

    document.querySelectorAll('.scan-price-btn').forEach(button => {
        button.addEventListener('click', selectPricePhoto);
    });
}

function selectPricePhoto(event) {
    if (ocrBusy) {
        return;
    }

    ocrTargetProductId = parseInt(event.currentTarget.dataset.id);
    pricePhotoInput.click();
}

function openOcrModal(productName) {
    ocrModalTitle.textContent = `Preço de ${productName}`;
    ocrStatus.textContent = 'Carregando a imagem...';
    ocrPrices.innerHTML = '';
    ocrModal.hidden = false;
}

function closeOcrModal() {
    if (ocrBusy) {
        return;
    }

    ocrModal.hidden = true;
    ocrTargetProductId = null;
}

function updateOcrProgress() {
    ocrStatus.textContent = 'Carregando a imagem...';
}

function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) {
                resolve(blob);
                return;
            }

            reject(new Error('Não foi possível preparar a imagem.'));
        }, 'image/png');
    });
}

async function prepareImagesForOcr(file) {
    if (!window.createImageBitmap) {
        return [file];
    }

    const image = await createImageBitmap(file);
    const maximumSide = 2000;
    const targetSide = 1400;
    const largestSide = Math.max(image.width, image.height);
    const scale = Math.min(maximumSide / largestSide, Math.max(1, targetSide / largestSide));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext('2d');
    context.filter = 'grayscale(1) contrast(1.7)';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close();

    const binaryCanvas = document.createElement('canvas');
    binaryCanvas.width = canvas.width;
    binaryCanvas.height = canvas.height;
    const binaryContext = binaryCanvas.getContext('2d');
    binaryContext.drawImage(canvas, 0, 0);

    const imageData = binaryContext.getImageData(0, 0, binaryCanvas.width, binaryCanvas.height);
    const pixels = imageData.data;

    for (let index = 0; index < pixels.length; index += 4) {
        const value = pixels[index] < 180 ? 0 : 255;
        pixels[index] = value;
        pixels[index + 1] = value;
        pixels[index + 2] = value;
    }

    binaryContext.putImageData(imageData, 0, 0);

    return Promise.all([
        canvasToBlob(canvas),
        canvasToBlob(binaryCanvas)
    ]);
}

function extractPricesFromText(text) {
    const matches = text.match(/\b(?:\d{1,3}(?:[.\s]\d{3})+|\d+)[,.]\s*\d{2}\b/g) || [];
    const uniquePrices = new Map();

    matches.forEach(match => {
        const normalized = match.replace(/\s/g, '');
        const separatorIndex = Math.max(normalized.lastIndexOf(','), normalized.lastIndexOf('.'));
        const integerPart = normalized.slice(0, separatorIndex).replace(/\D/g, '');
        const centsPart = normalized.slice(separatorIndex + 1).replace(/\D/g, '').slice(0, 2);
        const cents = (parseInt(integerPart, 10) * 100) + parseInt(centsPart, 10);

        if (Number.isFinite(cents) && cents >= 0 && !uniquePrices.has(cents)) {
            uniquePrices.set(cents, cents / 100);
        }
    });

    return [...uniquePrices.values()];
}

function showDetectedPrices(prices) {
    if (prices.length === 0) {
        ocrStatus.textContent = 'Não encontrei um preço com centavos. Tente outra foto, mais próxima e bem iluminada.';
        return;
    }

    ocrStatus.textContent = prices.length === 1
        ? 'Encontrei 1 preço. Toque para adicionar:'
        : `Encontrei ${prices.length} preços. Qual deles deseja adicionar?`;

    prices.forEach(price => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ocr-price-choice';
        button.dataset.price = String(price);
        button.textContent = `R$ ${formatPrice(price)}`;
        ocrPrices.appendChild(button);
    });
}

async function readPricesFromPhoto(event) {
    const file = event.target.files[0];
    const product = products.find(item => item.id === ocrTargetProductId);

    if (!file || !product) {
        pricePhotoInput.value = '';
        return;
    }

    openOcrModal(product.name);
    ocrBusy = true;
    closeOcrModalBtn.disabled = true;
    let worker;

    try {
        if (!window.Tesseract) {
            throw new Error('A biblioteca de leitura não foi carregada. Verifique sua internet.');
        }

        const preparedImages = await prepareImagesForOcr(file);
        worker = await Tesseract.createWorker('eng', 1, {
            logger: updateOcrProgress
        });
        await worker.setParameters({
            tessedit_char_whitelist: '0123456789,.$ ',
            preserve_interword_spaces: '1',
            tessedit_pageseg_mode: '11',
            user_defined_dpi: '300'
        });

        const recognizedTexts = [];
        const confidences = [];

        for (const preparedImage of preparedImages) {
            const result = await worker.recognize(preparedImage);
            recognizedTexts.push(result.data.text || '');
            confidences.push(result.data.confidence);
        }

        const recognizedText = recognizedTexts.join('\n--- segunda leitura ---\n');
        const averageConfidence = confidences.reduce((sum, value) => sum + value, 0) / confidences.length;

        console.group('Resultado do OCR');
        console.log('Texto reconhecido:', recognizedText);
        console.log('Confiança média:', averageConfidence);
        console.groupEnd();

        showDetectedPrices(extractPricesFromText(recognizedText));
    } catch (error) {
        console.error('Erro durante a leitura do OCR:', error);
        ocrStatus.textContent = error.message || 'Não foi possível ler esta foto. Tente novamente.';
    } finally {
        if (worker) {
            await worker.terminate();
        }

        // A foto nunca é salva. Remover o arquivo do input libera a referência após a leitura.
        pricePhotoInput.value = '';
        ocrBusy = false;
        closeOcrModalBtn.disabled = false;
    }
}

function applyDetectedPrice(event) {
    const button = event.target.closest('.ocr-price-choice');

    if (!button) {
        return;
    }

    const product = products.find(item => item.id === ocrTargetProductId);

    if (!product) {
        closeOcrModal();
        return;
    }

    product.price = Number(button.dataset.price);
    product.checked = true;
    saveProducts();
    renderProducts();
    updateTotal();

    addFeedback.textContent = `Preço de R$ ${formatPrice(product.price)} adicionado e ${product.name} marcado como comprado.`;
    closeOcrModal();
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
pricePhotoInput.addEventListener('change', readPricesFromPhoto);
ocrPrices.addEventListener('click', applyDetectedPrice);
closeOcrModalBtn.addEventListener('click', closeOcrModal);
ocrModal.addEventListener('click', function(event) {
    if (event.target === ocrModal) {
        closeOcrModal();
    }
});
productInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        addProducts();
    }
});

loadProducts();
