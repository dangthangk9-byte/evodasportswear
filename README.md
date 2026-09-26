# Evoda Sportswear — Website

Website tĩnh (static site) cho thương hiệu thời trang thể thao nữ Evoda Sportswear. Toàn bộ nội dung, sản phẩm, hình ảnh và thông số đã được đồng bộ theo tài liệu nội dung chính thức của thương hiệu (`Nội_dung_website_EVODA.pdf`) và bộ ảnh sản phẩm/bộ sưu tập/trang chủ thật.

Không cần build step / Node / npm để chạy site này — chỉ cần một static file server (Netlify, Live Server, `python3 -m http.server`, ...) vì các trang dùng `fetch()` để đọc dữ liệu JSON.

## Cấu trúc thư mục

```
/index.html                 Trang chủ
/san-pham/index.html        Danh sách sản phẩm
/san-pham/chi-tiet.html      Chi tiết sản phẩm (?slug=ev01-summer-set ...)
/bo-suu-tap/index.html      Danh sách bộ sưu tập
/bo-suu-tap/chi-tiet.html    Chi tiết bộ sưu tập (?slug=summer-set ...)
/tin-tuc/index.html         Danh sách tin tức
/tin-tuc/bai-viet.html       Chi tiết bài viết (?slug=... )
/ve-chung-toi/index.html    Giới thiệu thương hiệu (nội dung tĩnh)
/huong-dan-chon-size/       Hướng dẫn chọn size (bảng size cm + chiều cao/cân nặng)
/chinh-sach-doi-tra/        Chính sách đổi trả
/qa/                        Hỏi đáp (Q&A)

/data/products.json         9 sản phẩm EV01–EV09: tên, giá, màu, size, chất liệu, mô tả, tính năng, link TikTok...
/data/collections.json      6 bộ sưu tập BST01–BST06: câu chuyện, chất liệu, màu sắc, sản phẩm liên quan
/data/news.json             Bài viết tin tức (nội dung HTML đầy đủ)

/layout/head.html           Fragment <head> dùng chung (font, Tailwind CDN, meta cơ bản)
/layout/header.html         Fragment header/nav dùng chung
/layout/footer.html         Fragment footer dùng chung + modal hướng dẫn chọn size + JS chung (newsletter, reveal-on-scroll, active-nav)

/assets/images/san-pham/<slug>/       Ảnh sản phẩm theo từng slug
/assets/images/bo-suu-tap/<slug>/     poster.jpg + banner.jpg cho từng bộ sưu tập
/assets/images/trang-chu/             Ảnh trang chủ (hero, new arrivals, bestsellers, triết lý)
/assets/images/khac/                  Ảnh dùng chung khác (banner, hướng dẫn chọn size)
/assets/logo/logo.png                 Logo thương hiệu
```

## Cách hoạt động

Mỗi trang HTML là một file tĩnh, đã có sẵn `<title>`, meta description và Open Graph tags. Các trang danh sách/chi tiết (sản phẩm, bộ sưu tập, tin tức) dùng JavaScript thuần để `fetch()` dữ liệu từ file JSON tương ứng trong `/data/`, sau đó lọc theo tham số `?slug=` trên URL để hiển thị đúng nội dung.

Vì đây là site tĩnh không có server-side include, các phần header/footer dùng chung được nhúng trực tiếp (đã render sẵn) vào từng file HTML — không cần include động khi chạy.

## Cách chạy thử trên máy

- Cách đơn giản nhất: dùng extension **Live Server** của VSCode — mở thư mục này, click phải vào `index.html`, chọn "Open with Live Server".
- Hoặc chạy `python3 -m http.server 8000` trong thư mục này rồi mở `http://localhost:8000/`.
- Không mở trực tiếp file HTML bằng `file://` — trình duyệt sẽ chặn `fetch()` đọc file JSON cục bộ.

## Triển khai (Netlify)

Site không cần build command — chỉ cần publish thư mục gốc này. Trên Netlify: Build command để trống, Publish directory = `.` (thư mục gốc chứa `index.html`).

## Cập nhật nội dung

- Sửa sản phẩm: chỉnh `/data/products.json`.
- Sửa bộ sưu tập: chỉnh `/data/collections.json`.
- Thêm/sửa bài viết: chỉnh `/data/news.json`.
- Thêm ảnh mới: bỏ vào đúng thư mục trong `/assets/images/...` rồi cập nhật đường dẫn trong JSON tương ứng.

## Đã dọn dẹp

Các phần code cũ không còn dùng (pipeline CSV→JSON bằng Node, `css/style.css` và `js/*.js` cũ không được trang nào tham chiếu, file `make_builder.ps1` bị lỗi encoding không chạy được, `data/reviews.json` và `data/san-pham.csv` không còn dùng) đã được loại bỏ khỏi bản build này để tránh nhầm lẫn khi bảo trì sau này.

## Còn cần xác nhận thêm

- **Domain thật (Netlify/custom domain)**: chưa có nên các thẻ Open Graph đang dùng đường dẫn tương đối; khi có domain chính thức nên cập nhật thành URL tuyệt đối và thêm thẻ `canonical`.
- **Kết nối GitHub**: thư mục gốc chưa thấy `.git` — cần tự khởi tạo git repo / kết nối remote GitHub rồi push nếu chưa làm, để Netlify tự động deploy theo nhánh.
