(function () {
  'use strict';

  const products = [...document.querySelectorAll('.product')].map((card, index) => {
    const title = card.querySelector('h3')?.textContent.trim() || `Produto ${index + 1}`;
    const slug = title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return {
      id: card.dataset.id || slug || `produto-${index + 1}`,
      title,
      price: Number(card.dataset.price || 0),
      category: card.querySelector('.p-body > small')?.textContent.trim() || 'Utilidades',
      img: card.querySelector('.p-img img')?.getAttribute('src') || '',
      alt: card.querySelector('.p-img img')?.getAttribute('alt') || title,
      card
    };
  });

  const catalog = Object.fromEntries(products.map(product => [product.id, product]));
  let activeCategory = 'todos';
  let activeSearch = '';
  let activeQuickFilter = 'todos';
  let cart = [];
  try {
    const savedCart = JSON.parse(localStorage.getItem('hipposCartV4') || '[]');
    if (Array.isArray(savedCart)) {
      cart = savedCart
        .map(item => {
          const product = catalog[String(item?.id)];
          if (!product) return null;
          return {
            ...product,
            qty: Math.max(1, Number(item?.qty) || 1)
          };
        })
        .filter(item => item && item.id && item.title && Number.isFinite(item.price));
    }
  } catch {
    cart = [];
  }

  let currentProduct = null;

  const cartDrawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('overlay');
  const cartItems = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');
  const cartCount = document.querySelector('.cart b');
  const toast = document.getElementById('toast');
  const productModal = document.getElementById('productModal');
  const themeToggle = document.getElementById('themeToggle');
  const dataHora = document.getElementById('dataHora');
  const countdown = document.getElementById('countdown');
  const countHours = document.getElementById('countHours');
  const countMinutes = document.getElementById('countMinutes');
  const countSeconds = document.getElementById('countSeconds');
  const cartCouponRow = document.getElementById('cartCouponRow');
  const cartCouponLabel = document.getElementById('cartCouponLabel');
  const cartDiscount = document.getElementById('cartDiscount');
  const removeCoupon = document.getElementById('removeCoupon');
  const couponAvailability = document.getElementById('couponAvailability');
  const couponAvailabilityText = document.getElementById('couponAvailabilityText');
  const availableCouponButton = document.getElementById('availableCouponButton');
  const modalOffer = document.getElementById('modalOffer');
  const modalOldPrice = document.getElementById('modalOldPrice');
  const orderSuccess = document.getElementById('orderSuccess');
  const successDetails = document.getElementById('successDetails');
  const successContinue = document.getElementById('successContinue');

  let currentProductFeatured = false;

  let activeCoupon = JSON.parse(localStorage.getItem('hipposCouponV4') || 'null');

  function money(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function saveCart() {
    localStorage.setItem('hipposCartV4', JSON.stringify(cart));
  }

  function cartQuantity() {
    return cart.reduce((total, item) => total + item.qty, 0);
  }

  function updateCartCount() {
    if (cartCount) cartCount.textContent = cartQuantity();
  }

  function showToast(message, type = '') {
    toast.textContent = message;
    toast.classList.remove('coupon-success', 'coupon-warning');
    if (type) toast.classList.add(type);
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      toast.classList.remove('show', 'coupon-success', 'coupon-warning');
    }, type === 'coupon-success' ? 4200 : 3000);
  }

  function renderCart() {
    updateCartCount();

    if (!cart.length) {
      cartItems.innerHTML = `
        <div class="empty-cart">
          <div>🛒</div>
          <strong>Seu carrinho está vazio</strong>
          <p>Adicione produtos para começar sua compra.</p>
          <button class="continue-btn" type="button" data-close-cart>Continuar comprando</button>
        </div>`;
    } else {
      cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
          <img src="${item.img}" alt="${item.alt}" onerror="this.onerror=null;this.src='assets/logo.jpeg';">
          <div class="cart-item-info">
            <strong>${item.title}</strong>
            <span>${money(item.price)}</span>
            <div class="qty-controls">
              <button type="button" data-minus="${item.id}" aria-label="Diminuir quantidade">−</button>
              <b>${item.qty}</b>
              <button type="button" data-plus="${item.id}" aria-label="Aumentar quantidade">+</button>
              <button type="button" class="remove-item" data-remove="${item.id}">Remover</button>
            </div>
          </div>
        </div>`).join('');
    }

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    if (!cart.length) {
      activeCoupon = null;
      localStorage.removeItem('hipposCouponV4');
    }

    const eligibleSubtotal = getEligibleSubtotal();
    const featuredDiscount = getFeaturedDiscount();

    // Se o valor elegível caiu abaixo do mínimo, o cupom regular é retirado.
    if (activeCoupon?.type === 'regular' && eligibleSubtotal < activeCoupon.minimum) {
      activeCoupon = null;
      localStorage.removeItem('hipposCouponV4');
    }

    const regularDiscount = getRegularCouponDiscount(eligibleSubtotal);
    const discount = featuredDiscount + regularDiscount;

    if (discount > 0) {
      cartCouponRow.hidden = false;
      if (featuredDiscount > 0 && regularDiscount > 0) {
        cartCouponLabel.textContent = 'Destaque 5% + cupom';
      } else if (featuredDiscount > 0) {
        cartCouponLabel.textContent = 'Desconto dos produtos em destaque';
      } else {
        cartCouponLabel.textContent = `Cupom ${activeCoupon.code}`;
      }
      cartDiscount.textContent = `- ${money(discount)}`;
    } else {
      cartCouponRow.hidden = true;
    }

    updateCouponAvailability(eligibleSubtotal);

    const total = Math.max(0, subtotal - discount);
    cartTotal.textContent = money(total);
    saveCart();
  }

  const featuredIds = new Set(
    [...document.querySelectorAll('.featured-card')].map(card => card.dataset.featuredId)
  );

  function isFeaturedItem(item) {
    return Boolean(item?.featured) || featuredIds.has(item?.id);
  }

  function getFeaturedDiscount() {
    return cart
      .filter(isFeaturedItem)
      .reduce((sum, item) => sum + (item.price * item.qty * 0.05), 0);
  }

  function getEligibleSubtotal() {
    return cart
      .filter(item => !isFeaturedItem(item))
      .reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function getRegularCouponDiscount(eligibleSubtotal) {
    if (!activeCoupon || activeCoupon.type !== 'regular') return 0;
    if (eligibleSubtotal < activeCoupon.minimum) return 0;
    return Math.min(activeCoupon.discount, eligibleSubtotal);
  }

  function getTotalDiscount(subtotal) {
    return getFeaturedDiscount() + getRegularCouponDiscount(getEligibleSubtotal());
  }

  function getBestAvailableCoupon(eligibleSubtotal) {
    const coupons = [...document.querySelectorAll('.coupon')].map(card => ({
      code: card.dataset.coupon,
      discount: Number(card.dataset.discount),
      minimum: Number(card.dataset.minimum)
    }));

    return coupons
      .filter(coupon => eligibleSubtotal >= coupon.minimum)
      .sort((a, b) => b.minimum - a.minimum)[0] || null;
  }

  function updateCouponAvailability(eligibleSubtotal) {
    if (!couponAvailability || !couponAvailabilityText || !availableCouponButton) return;

    // Mantém o aviso chamativo visível enquanto houver itens no carrinho.
    if (cart.length === 0) {
      couponAvailability.hidden = true;
      return;
    }

    couponAvailability.hidden = false;
    const available = getBestAvailableCoupon(eligibleSubtotal);

    if (activeCoupon?.type === 'regular') {
      couponAvailabilityText.textContent =
        `Cupom ${activeCoupon.code} aplicado! Você economiza ${money(getRegularCouponDiscount(eligibleSubtotal))} nos produtos elegíveis.`;
      availableCouponButton.textContent = 'Cupom aplicado ✓';
      availableCouponButton.disabled = true;
      return;
    }

    availableCouponButton.disabled = false;
    if (available) {
      couponAvailabilityText.textContent =
        `Você atingiu ${money(eligibleSubtotal)} em produtos elegíveis. Use ${available.code} e ganhe ${money(available.discount)} OFF!`;
      availableCouponButton.textContent = `Usar ${available.code}`;
      availableCouponButton.onclick = () => applyCoupon(available);
      return;
    }

    const nextCoupon = [...document.querySelectorAll('.coupon')]
      .map(card => ({ code: card.dataset.coupon, discount: Number(card.dataset.discount), minimum: Number(card.dataset.minimum) }))
      .filter(coupon => coupon.minimum > eligibleSubtotal)
      .sort((a, b) => a.minimum - b.minimum)[0];

    if (nextCoupon) {
      couponAvailabilityText.textContent =
        `Você tem ${money(eligibleSubtotal)} em produtos elegíveis. Faltam ${money(nextCoupon.minimum - eligibleSubtotal)} para liberar ${nextCoupon.code} e ganhar ${money(nextCoupon.discount)} OFF!`;
      availableCouponButton.textContent = 'Ver cupons';
      availableCouponButton.onclick = () => document.querySelector('.coupon-section')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      couponAvailabilityText.textContent = 'Confira os cupons da loja e escolha o desconto ideal para sua compra.';
      availableCouponButton.textContent = 'Ver cupons';
      availableCouponButton.onclick = () => document.querySelector('.coupon-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function applyCoupon(coupon) {
    const eligibleSubtotal = getEligibleSubtotal();

    if (eligibleSubtotal < coupon.minimum) {
      showToast(`Para usar ${coupon.code}, você precisa de R$ ${coupon.minimum.toFixed(2).replace('.', ',')} em produtos fora dos destaques.`, 'coupon-warning');
      return;
    }

    // Apenas UM cupom regular por compra.
    activeCoupon = {
      type: 'regular',
      code: coupon.code,
      discount: coupon.discount,
      minimum: coupon.minimum
    };
    localStorage.setItem('hipposCouponV4', JSON.stringify(activeCoupon));
    renderCart();
    showToast(`🎉 CUPOM ${coupon.code} APLICADO! Você já está economizando nos produtos elegíveis.`, 'coupon-success');
  }

  function openCart() {
    renderCart();
    cartDrawer.classList.add('open');
    overlay.classList.add('show');
    document.body.classList.add('no-scroll');
  }

  function closePanels() {
    cartDrawer.classList.remove('open');
    productModal.classList.remove('show');
    overlay.classList.remove('show');
    document.body.classList.remove('no-scroll');
  }

  function addToCart(product, quantity = 1) {
    const found = cart.find(item => item.id === product.id);
    if (found) {
      found.qty += quantity;
    } else {
      cart.push({ ...product, qty: quantity });
    }
    renderCart();
    showToast(`${product.title} foi adicionado ao carrinho.`);
  }

  function productData(card) {
    return products.find(product => product.card === card);
  }

  function openProduct(product, featured = false) {
    currentProduct = product;
    currentProductFeatured = featured;
    document.getElementById('modalImg').src = product.img;
    document.getElementById('modalImg').alt = product.alt;
    document.getElementById('modalTitle').textContent = product.title;
    document.getElementById('modalCategory').textContent = product.category;

    const priceElement = document.getElementById('modalPrice');
    const modalAdd = document.getElementById('modalAdd');

    if (featured) {
      const featuredPrice = product.price * 0.95;
      modalOldPrice.hidden = false;
      modalOldPrice.textContent = money(product.price);
      modalOffer.hidden = false;
      priceElement.textContent = money(featuredPrice);
      priceElement.classList.add('featured-price-modal');
      modalAdd.textContent = 'Comprar com 5% OFF';
    } else {
      modalOldPrice.hidden = true;
      modalOffer.hidden = true;
      priceElement.textContent = money(product.price);
      priceElement.classList.remove('featured-price-modal');
      modalAdd.textContent = 'Adicionar ao carrinho';
    }

    document.getElementById('modalQty').value = 1;
    productModal.classList.add('show');
    overlay.classList.add('show');
    document.body.classList.add('no-scroll');
  }

  // Produtos em destaque: clique abre os detalhes e oferece 5% OFF.
  document.querySelectorAll('.featured-card').forEach(card => {
    const product = catalog[card.dataset.featuredId];
    if (!product) return;

    card.addEventListener('click', event => {
      if (event.target.closest('.featured-buy')) return;
      openProduct(product, true);
    });

    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openProduct(product, true);
      }
    });

    card.querySelector('.featured-buy')?.addEventListener('click', event => {
      event.stopPropagation();
      addFeaturedToCart(product);
    });
  });

  // Ofertas da semana: o card abre os detalhes; o botão adiciona ao carrinho sem abri-lo.
  document.querySelectorAll('.flash-product').forEach(card => {
    const product = catalog[card.dataset.flashId];
    if (!product) {
      const button = card.querySelector('.flash-buy');
      if (button) {
        button.disabled = true;
        button.textContent = 'Indisponível';
      }
      return;
    }

    card.setAttribute('aria-label', `Ver detalhes de ${product.title}`);
    card.addEventListener('click', event => {
      if (event.target.closest('.flash-buy')) return;
      openProduct(product);
    });
    card.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target === card) {
        event.preventDefault();
        openProduct(product);
      }
    });
    card.querySelector('.flash-buy')?.addEventListener('click', event => {
      event.stopPropagation();
      addToCart(product);
    });
  });

  function addFeaturedToCart(product, quantity = 1) {
    // O produto em destaque recebe 5% OFF automaticamente.
    // Esse desconto não é um cupom acumulável e não altera o valor dos demais produtos.
    const found = cart.find(item => item.id === product.id);
    if (found) found.qty += quantity;
    else cart.push({ ...product, qty: quantity, featured: true });

    renderCart();
    showToast(`${product.title} adicionado com 5% OFF exclusivo.`);
  }

  // 1) Carrinho: adicionar produtos e atualizar quantidade.
  document.querySelector('.cart')?.addEventListener('click', event => {
    event.preventDefault();
    openCart();
  });

  document.getElementById('productGrid')?.addEventListener('click', event => {
    const buyButton = event.target.closest('.buy-btn');
    const favoriteButton = event.target.closest('.p-img > button');
    const card = event.target.closest('.product');

    if (buyButton && card) {
      event.stopPropagation();
      const product = productData(card);
      if (product) {
        addToCart(product);
      }
      return;
    }

    if (favoriteButton) {
      event.stopPropagation();
      favoriteButton.classList.toggle('liked');
      favoriteButton.textContent = favoriteButton.classList.contains('liked') ? '♥' : '♡';
      showToast(favoriteButton.classList.contains('liked') ? 'Produto salvo nos favoritos.' : 'Produto removido dos favoritos.');
      return;
    }

    if (card) {
      const product = productData(card);
      if (product) openProduct(product);
    }
  });

  cartItems.addEventListener('click', event => {
    const id = event.target.dataset.plus || event.target.dataset.minus || event.target.dataset.remove;
    if (!id) return;

    const item = cart.find(product => product.id === id);
    if (!item) return;

    if (event.target.dataset.plus) item.qty += 1;
    if (event.target.dataset.minus) item.qty = Math.max(1, item.qty - 1);
    if (event.target.dataset.remove) cart = cart.filter(product => product.id !== id);

    renderCart();
  });

  document.querySelectorAll('[data-close-cart]').forEach(button => button.addEventListener('click', closePanels));
  document.getElementById('closeCart')?.addEventListener('click', closePanels);
  document.getElementById('closeModal')?.addEventListener('click', closePanels);
  overlay?.addEventListener('click', closePanels);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closePanels();
  });

  document.getElementById('modalPlus')?.addEventListener('click', () => {
    const input = document.getElementById('modalQty');
    input.value = Number(input.value) + 1;
  });

  document.getElementById('modalMinus')?.addEventListener('click', () => {
    const input = document.getElementById('modalQty');
    input.value = Math.max(1, Number(input.value) - 1);
  });

  document.getElementById('modalAdd')?.addEventListener('click', () => {
    if (!currentProduct) return;
    const quantity = Math.max(1, Number(document.getElementById('modalQty').value) || 1);

    if (currentProductFeatured) {
      addFeaturedToCart(currentProduct, quantity);
    } else {
      addToCart(currentProduct, quantity);
    }
    closePanels();
  });

  // Pesquisa, categorias e filtros do catálogo.
  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function normalizeText(value = '') {
    return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function categoryMatches(product, category) {
    if (category === 'todos') return true;
    const text = normalizeText(`${product.title} ${product.category}`);
    const rules = {
      cozinha: /cozinha|utensil|panela|talher|prato|copo|garrafa|organizador de cozinha|kitchen/,
      organizacao: /organiz|caixa|cesto|prateleira|storage|closet/,
      limpeza: /limpeza|esponja|vassoura|escova|mop|clean|sponge/,
      iluminacao: /luminaria|lamp|light|iluminacao|led/,
      banheiro: /banheiro|ducha|chuveiro|bath|shower|toalha/,
      decoracao: /decoracao|luminaria|quadro|vaso|ornament|home decor/,
      utilidades: /utilidade|acessorio|caixa|produto|eletronico|electronics|jewel/,
      novidades: Boolean(product.isApi) || /novo|novidade|novo produto/.test(text),
      ofertas: Boolean(product.isOffer)
    };
    return Boolean(rules[category] && (typeof rules[category] === 'boolean' ? rules[category] : rules[category].test(text)));
  }

  function updateCatalogView() {
    const visibleProducts = products.filter(product => {
      const queryMatch = !activeSearch || normalizeText(`${product.title} ${product.category}`).includes(normalizeText(activeSearch));
      const categoryMatch = categoryMatches(product, activeCategory);
      let quickMatch = true;
      if (activeQuickFilter === 'mais-vendidos') {
        quickMatch = product.card.textContent.includes('mil') || product.card.textContent.includes('2,4') || product.card.textContent.includes('MAIS VENDIDO');
      } else if (activeQuickFilter === 'novidades') {
        quickMatch = product.card.textContent.includes('NOVO') || product.isApi;
      }
      const visible = queryMatch && categoryMatch && quickMatch;
      product.card.hidden = !visible;
      return visible;
    });

    const heading = document.getElementById('productsHeading');
    const subheading = document.getElementById('productsSubheading');
    const backButton = document.getElementById('showAllProducts');
    const categoryNames = {
      todos: 'Todos os produtos', cozinha: 'Produtos de cozinha', organizacao: 'Organização',
      limpeza: 'Produtos de limpeza', iluminacao: 'Iluminação', banheiro: 'Banheiro',
      decoracao: 'Casa e decoração', utilidades: 'Utilidades para sua casa', novidades: 'Novidades', ofertas: 'Ofertas do dia'
    };
    if (heading) heading.textContent = activeSearch ? `Resultados para “${activeSearch}”` : (categoryNames[activeCategory] || 'Todos os produtos');
    if (subheading) subheading.textContent = activeCategory === 'todos' && !activeSearch
      ? "Confira todo o catálogo da Hippo's Store."
      : `${visibleProducts.length} produto(s) encontrado(s).`;
    if (backButton) {
      // O botão permanece disponível para voltar ao catálogo completo a qualquer momento.
      const isFullCatalog = activeCategory === 'todos' && !activeSearch && activeQuickFilter === 'todos';
      backButton.hidden = false;
      backButton.textContent = isFullCatalog ? '✓ Todos os produtos' : '← Ver todos os produtos';
      backButton.setAttribute('aria-label', isFullCatalog ? 'Catálogo completo selecionado' : 'Voltar para todos os produtos');
      backButton.classList.toggle('is-current', isFullCatalog);
    }

    document.querySelectorAll('.filter').forEach(button => button.classList.toggle('active', button.dataset.filter === activeQuickFilter));
    if (activeSearch && visibleProducts.length === 0) showToast('Nenhum produto encontrado.');
  }

  function selectCategory(category, scroll = true) {
    activeCategory = category;
    activeSearch = '';
    const searchInput = document.getElementById('busca');
    if (searchInput) searchInput.value = '';
    activeQuickFilter = 'todos';
    updateCatalogView();
    if (scroll) document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.querySelectorAll('[data-category]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      selectCategory(link.dataset.category);
    });
  });

  document.querySelector('.search')?.addEventListener('submit', event => {
    event.preventDefault();
    activeSearch = document.getElementById('busca').value.trim();
    activeCategory = 'todos';
    activeQuickFilter = 'todos';
    updateCatalogView();
    document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('busca')?.addEventListener('input', event => {
    activeSearch = event.target.value.trim();
    activeCategory = 'todos';
    activeQuickFilter = 'todos';
    updateCatalogView();
  });

  document.getElementById('showAllProducts')?.addEventListener('click', () => selectCategory('todos', false));

  document.querySelectorAll('.filter').forEach(button => {
    button.addEventListener('click', () => {
      activeCategory = 'todos';
      activeSearch = '';
      activeQuickFilter = button.dataset.filter || 'todos';
      const searchInput = document.getElementById('busca');
      if (searchInput) searchInput.value = '';
      updateCatalogView();
    });
  });

  // Carrega produtos fictícios de uma API pública e adiciona-os ao catálogo.
  async function loadApiProducts() {
    const status = document.getElementById('apiStatus');
    try {
      const response = await fetch('https://fakestoreapi.com/products?limit=8');
      if (!response.ok) throw new Error('A API não respondeu corretamente.');
      const apiProducts = await response.json();
      const grid = document.getElementById('productGrid');
      const categoryMap = {
        "men's clothing": 'Moda', "women's clothing": 'Moda', jewelery: 'Acessórios', electronics: 'Eletrônicos'
      };
      apiProducts.forEach((item, index) => {
        const id = `api-${item.id}`;
        const title = item.title || `Produto da API ${index + 1}`;
        const category = categoryMap[item.category] || 'Utilidades';
        const price = Math.round(Number(item.price || 0) * 5.5 * 100) / 100;
        const card = document.createElement('article');
        card.className = 'product api-product';
        card.dataset.id = id;
        card.dataset.price = String(price);
        card.innerHTML = `
          <div class="p-img p-api"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(title)}" loading="lazy"><label>API</label><button type="button" aria-label="Favoritar produto">♡</button></div>
          <div class="p-body"><small>${escapeHtml(category)}</small><h3>${escapeHtml(title)}</h3><div class="rating">Dados recebidos da Fake Store API</div><div class="price"><small>R$</small><strong>${price.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></div><div class="shipping">Preço de referência convertido (estimativa)</div><button class="buy-btn" type="button">Adicionar ao carrinho</button></div>`;
        grid.appendChild(card);
        const product = { id, title, price, category, img: item.image, alt: title, card, isApi: true };
        products.push(product);
        catalog[id] = product;
      });
      if (status) status.textContent = `${apiProducts.length} produtos adicionais carregados da Fake Store API.`;
      updateCatalogView();
    } catch (error) {
      if (status) status.textContent = 'Não foi possível carregar os produtos da API agora. Os produtos principais continuam disponíveis. Verifique sua conexão e recarregue a página.';
    }
  }

  updateCatalogView();
  loadApiProducts();

  // 4) Tema claro/escuro com localStorage.
  function updateThemeButton(isDark) {
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    themeToggle.setAttribute('aria-label', isDark ? 'Ativar modo claro' : 'Ativar modo escuro');
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.title = isDark ? 'Modo claro' : 'Modo escuro';
  }

  function applyTheme(isDark) {
    document.body.classList.toggle('dark-theme', isDark);
    updateThemeButton(isDark);
    localStorage.setItem('hipposTheme', isDark ? 'dark' : 'light');
  }

  const savedTheme = localStorage.getItem('hipposTheme');
  applyTheme(savedTheme === 'dark');

  themeToggle?.addEventListener('click', () => {
    applyTheme(!document.body.classList.contains('dark-theme'));
  });

  // 5) Data e hora atualizadas automaticamente.
  function updateDateTime() {
    if (!dataHora) return;
    const now = new Date();
    dataHora.textContent = `Atualizado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`;
  }

  updateDateTime();
  setInterval(updateDateTime, 1000);

  // 6) Cupons funcionais.
  document.querySelectorAll('.coupon').forEach(card => {
    const button = card.querySelector('button');
    button.addEventListener('click', () => {
      if (activeCoupon?.type === 'regular' && activeCoupon.code !== card.dataset.coupon) {
        showToast(`O cupom ${activeCoupon.code} já está aplicado. Remova-o para usar outro.`);
        return;
      }

      applyCoupon({
        code: card.dataset.coupon,
        discount: Number(card.dataset.discount),
        minimum: Number(card.dataset.minimum)
      });

      document.querySelectorAll('.coupon button').forEach(item => {
        item.classList.remove('applied');
        item.textContent = 'Aplicar';
      });

      if (activeCoupon?.type === 'regular' && activeCoupon?.code === card.dataset.coupon) {
        button.classList.add('applied');
        button.textContent = 'Aplicado ✓';
      }
    });
  });

  removeCoupon?.addEventListener('click', () => {
    activeCoupon = null;
    localStorage.removeItem('hipposCouponV4');
    renderCart();
    document.querySelectorAll('.coupon button').forEach(item => {
      item.classList.remove('applied');
      item.textContent = 'Aplicar';
    });
    showToast('Cupom removido.');
  });

  document.querySelector('.newsletter form')?.addEventListener('submit', event => {
    event.preventDefault();
    showToast('Cadastro realizado com sucesso!');
    event.target.reset();
  });

  // Finalização da compra: mostra uma página de confirmação com o resumo do pedido.
  document.getElementById('checkout')?.addEventListener('click', () => {
    if (!cart.length) {
      showToast('Seu carrinho está vazio.');
      return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const discount = getTotalDiscount(subtotal);
    const total = Math.max(0, subtotal - discount);
    const orderNumber = `HP-${Date.now().toString().slice(-8)}`;
    const itemCount = cartQuantity();

    successDetails.innerHTML = `
      <div class="success-line"><span>Pedido</span><strong>#${orderNumber}</strong></div>
      <div class="success-line"><span>Itens</span><strong>${itemCount}</strong></div>
      <div class="success-line"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
      ${discount > 0 ? `<div class="success-line"><span>Descontos aplicados</span><strong>- ${money(discount)}</strong></div>` : ''}
      <div class="success-line success-total"><span>Total</span><strong>${money(total)}</strong></div>
    `;

    document.getElementById('successMessage').textContent =
      `Seu pedido #${orderNumber} foi registrado. Esta versão acadêmica simula a confirmação da compra.`;

    closePanels();
    document.querySelector('main').hidden = true;
    document.querySelector('footer')?.setAttribute('hidden', '');
    orderSuccess.hidden = false;
    orderSuccess.scrollIntoView({ behavior: 'smooth' });

    // Guarda um resumo do último pedido e limpa o carrinho.
    localStorage.setItem('hipposLastOrder', JSON.stringify({
      orderNumber, items: cart, subtotal, discount, total,
      coupon: activeCoupon
    }));
    cart = [];
    activeCoupon = null;
    localStorage.removeItem('hipposCartV4');
    localStorage.removeItem('hipposCouponV4');
    renderCart();
  });

  successContinue?.addEventListener('click', () => {
    orderSuccess.hidden = true;
    document.querySelector('main').hidden = false;
    document.querySelector('footer')?.removeAttribute('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // 7) Contador regressivo real das ofertas.
  function startCountdown() {
    if (!countdown) return;

    const storageKey = 'hipposFlashDeadlineV4';
    let deadline = Number(localStorage.getItem(storageKey));

    if (!deadline || deadline <= Date.now()) {
      deadline = Date.now() + ((2 * 60 * 60) + (45 * 60) + 18) * 1000;
      localStorage.setItem(storageKey, String(deadline));
    }

    function tick() {
      const remaining = Math.max(0, deadline - Date.now());
      const totalSeconds = Math.floor(remaining / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      countHours.textContent = String(hours).padStart(2, '0');
      countMinutes.textContent = String(minutes).padStart(2, '0');
      countSeconds.textContent = String(seconds).padStart(2, '0');

      if (remaining <= 0) {
        countdown.innerHTML = '<b>00</b><em>:</em><b>00</b><em>:</em><b>00</b>';
        clearInterval(countdown.timer);
      }
    }

    tick();
    countdown.timer = setInterval(tick, 1000);
  }

  startCountdown();

  renderCart();

  if (activeCoupon?.type === 'featured') {
    document.querySelectorAll('.coupon button').forEach(item => {
      item.classList.remove('applied');
      item.textContent = 'Aplicar';
    });
  }
})();

/* Reflexão sobre Clean Code: organizei as funcionalidades em funções com nomes claros, como renderCart, updateCatalogView e loadApiProducts, separei a filtragem da interface e usei comentários curtos para explicar regras específicas. Também tratei falhas na API e normalizei textos para facilitar a busca. Ainda posso melhorar separando o JavaScript em módulos, criando testes automatizados e substituindo os preços de referência da API por preços cadastrados pela própria loja. */
