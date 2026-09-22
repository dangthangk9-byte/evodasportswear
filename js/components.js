// components.js
const headerHTML = `
<header class="site-header">
    <div class="container header-inner">
        <a href="/" class="logo">
            <!-- TODO: Thay logo thực tế -->
            <img src="assets/logo/logo.png" alt="Evoda Logo" onerror="this.src=''; this.alt='EVODA'">
        </a>
        <nav class="main-nav" id="mainNav">
            <a href="/index.html" class="nav-link">Trang chủ</a>
            <a href="/san-pham/" class="nav-link">Sản phẩm</a>
            <a href="/bo-suu-tap/" class="nav-link">Bộ sưu tập</a>
            <a href="/ve-chung-toi/" class="nav-link">Về chúng tôi</a>
            <a href="/tin-tuc/" class="nav-link">Tin tức</a>
        </nav>
        <div class="header-actions">
            <span class="search-icon">🔍</span>
            <a href="https://www.tiktok.com/@evoda.sportwear?_r=1&_t=ZS-99v8i0FZNG1" target="_blank" rel="noopener noreferrer" class="btn btn-primary">MUA NGAY</a>
            <button class="mobile-menu-btn" id="mobileMenuBtn">☰</button>
        </div>
    </div>
</header>
`;

const footerHTML = `
<footer class="site-footer">
    <div class="container">
        <div class="footer-grid">
            <div class="footer-col">
                <h4>Về thương hiệu</h4>
                <ul>
                    <li><a href="/ve-chung-toi/">Câu chuyện thương hiệu</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h4>Hỗ trợ</h4>
                <ul>
                    <li><a href="#">Hướng dẫn chọn size</a> <!-- TODO --></li>
                    <li><a href="#">Chính sách đổi trả</a> <!-- TODO --></li>
                    <li><a href="#">Q&A</a> <!-- TODO --></li>
                </ul>
            </div>
            <div class="footer-col">
                <h4>Liên hệ</h4>
                <ul>
                    <li>Gọi 094 808 85 95</li>
                    <li>Email evoda.sportwear@gmail.com</li>
                    <li><a href="https://www.facebook.com/profile.php?id=61574619090811" target="_blank" rel="noopener noreferrer">Messenger</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h4>Mạng xã hội</h4>
                <ul>
                    <li><a href="https://www.tiktok.com/@evoda.sportwear?is_from_webapp=1&sender_device=pc" target="_blank" rel="noopener noreferrer">TikTok</a></li>
                    <li><a href="https://www.facebook.com/profile.php?id=61574619090811" target="_blank" rel="noopener noreferrer">Facebook</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h4>Đăng ký nhận tin</h4>
                <a href="https://www.facebook.com/profile.php?id=61574619090811" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="color: white; border-color: white;">Nhắn tin qua Messenger</a>
            </div>
        </div>
        <div class="footer-bottom">
            <p>Copyright © EVODA SPORTSWEAR. All rights reserved.</p>
            <p>ATELIER MOVEMENT • MINIMALIST ACTIVEWEAR</p>
        </div>
    </div>
</footer>
`;

const floatingButtonsHTML = `
<style>
.floating-buttons {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 999;
}
.float-btn {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: transform 0.3s ease;
    background-color: #fff;
}
.float-btn:hover {
    transform: translateY(-3px);
}
.float-btn svg {
    width: 24px;
    height: 24px;
}
</style>
<div class="floating-buttons">
    <a href="https://www.facebook.com/profile.php?id=61574619090811" target="_blank" rel="noopener noreferrer" class="float-btn" title="Facebook Messenger">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0084FF"><path d="M12 2C6.477 2 2 6.145 2 11.26c0 2.923 1.493 5.513 3.82 7.227v3.298c0 .285.31.45.548.307l3.376-2.023c.725.2 1.485.308 2.256.308 5.523 0 10-4.145 10-9.26C22 6.145 17.523 2 12 2zm1.096 12.396l-2.614-2.78-5.114 2.78 5.61-5.962 2.656 2.78 5.072-2.78-5.61 5.962z"/></svg>
    </a>
    <a href="https://www.tiktok.com/@evoda.sportwear?is_from_webapp=1&sender_device=pc" target="_blank" rel="noopener noreferrer" class="float-btn" title="TikTok Shop">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000000"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.2c0 1.95-.62 3.89-1.85 5.37-1.35 1.64-3.4 2.63-5.58 2.75-2.22.13-4.52-.39-6.32-1.74-1.74-1.3-2.88-3.32-3.1-5.49-.24-2.31.42-4.72 1.94-6.49 1.42-1.66 3.52-2.67 5.72-2.83.21-.02.43-.02.64-.02v4.06c-1.36.01-2.74.52-3.75 1.5-1.09 1.07-1.63 2.67-1.37 4.19.26 1.48 1.34 2.81 2.75 3.33 1.48.55 3.23.32 4.51-.55 1.25-.85 1.94-2.34 1.95-3.87V.02h.1z"/></svg>
    </a>
</div>
`;

function renderComponents() {
    // Render Header
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        headerPlaceholder.innerHTML = headerHTML;
    }

    // Render Footer
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        footerPlaceholder.innerHTML = footerHTML;
    }

    // Render Floating Buttons
    const floatingPlaceholder = document.getElementById('floating-buttons-placeholder');
    if (floatingPlaceholder) {
        floatingPlaceholder.innerHTML = floatingButtonsHTML;
    }

    // Mobile menu toggle
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const mainNav = document.getElementById('mainNav');
    if (mobileBtn && mainNav) {
        mobileBtn.addEventListener('click', () => {
            mainNav.classList.toggle('active');
        });
    }

    // Active state for nav
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const linkPath = new URL(link.href).pathname;
        if (currentPath === linkPath || (currentPath === '/' && linkPath === '/index.html')) {
            link.classList.add('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', renderComponents);
