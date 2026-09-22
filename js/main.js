// Formatter tiền tệ
const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price) + '₫';
};

// Fetch và render sản phẩm nổi bật
async function loadFeaturedProducts() {
    try {
        const response = await fetch('data/products.json');
        if (!response.ok) throw new Error('Không thể tải dữ liệu sản phẩm');
        
        const products = await response.json();
        
        // Lấy 4 sản phẩm đầu tiên làm nổi bật (vì CSV không có cờ isFeatured)
        const featured = products.slice(0, 4);
        
        const productGrid = document.getElementById('featured-product-grid');
        if (!productGrid) return;
        
        productGrid.innerHTML = featured.map(p => `
            <div class="product-card">
                <a href="/san-pham/chi-tiet.html?slug=${p.slug}" class="product-image-wrapper">
                    <img src="${p.image}" alt="${p.name}" loading="lazy">
                    ${p.label !== 'TODO' ? `<span class="product-badge">${p.label}</span>` : ''}
                </a>
                <div class="product-info">
                    <div class="product-category">${p.collection || p.category}</div>
                    <a href="/san-pham/chi-tiet.html?slug=${p.slug}">
                        <h3 class="product-name">${p.name}</h3>
                    </a>
                    <div class="product-price">${formatPrice(p.price)}</div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Fetch và render đánh giá
async function loadReviews() {
    try {
        const response = await fetch('data/reviews.json');
        if (!response.ok) throw new Error('Không thể tải dữ liệu đánh giá');
        
        const reviews = await response.json();
        const reviewsGrid = document.getElementById('reviews-grid');
        if (!reviewsGrid) return;
        
        reviewsGrid.innerHTML = reviews.map(r => `
            <div class="review-card">
                <div class="review-header">
                    <img src="${r.image}" alt="Avatar" class="review-avatar" onerror="this.src=''; this.alt='Avatar'" loading="lazy">
                    <div class="review-meta">
                        <h4>${r.customerName}</h4>
                        ${r.verified ? '<span class="verified-badge">✔ ĐÃ MUA HÀNG</span>' : ''}
                    </div>
                </div>
                <div class="review-content">"${r.content}"</div>
                <div class="review-product">Sản phẩm: ${r.productPurchased}</div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedProducts();
    loadReviews();
});
