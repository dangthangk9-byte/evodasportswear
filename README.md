# Evoda Sportswear - Website Branding

## Cấu trúc thư mục
- `/css`: Chứa `style.css` (biến màu, font, CSS chính).
- `/js`: Chứa `components.js` (header, footer dùng chung) và `main.js` (logic trang chủ).
- `/data`: Chứa `san-pham.csv`, `products.json`, và `reviews.json`.
- `/scripts`: Chứa script `csv-to-json.js` để parse CSV thành JSON.
- `index.html`: Trang chủ chính.

## Yêu cầu môi trường
- NodeJS (để chạy script convert CSV sang JSON)
- Một live server để chạy web cục bộ (vì có sử dụng `fetch` đọc file JSON). Bạn có thể dùng extension "Live Server" của VSCode.

## Cách chạy thử trên máy
1. Cài đặt extension **Live Server** trong Visual Studio Code.
2. Mở thư mục `evoda-website` trong VSCode.
3. Chạy script chuyển đổi CSV (nếu có cập nhật file CSV mới):
   Mở terminal trong VSCode và chạy: `node scripts/csv-to-json.js`
4. Click chuột phải vào `index.html` và chọn **"Open with Live Server"**.
5. Trình duyệt sẽ mở website tại địa chỉ kiểu `http://127.0.0.1:5500/`.

## Các điểm TODO (cần hoàn thiện hoặc bổ sung)
1. **Dữ liệu CSV bị thiếu so với thiết kế**: 
   - Không có cờ `isFeatured` để đánh dấu sản phẩm nổi bật, hiện tại script tự động lấy 4 sản phẩm đầu tiên làm nổi bật.
   - Không có trường `label` (NEW/BESTSELLER/SIGNATURE), đang để `TODO`.
   - Không có `category` cụ thể, đang dùng tạm cột `bo_suu_tap`.
2. **Hình ảnh**: Các src ảnh hiện tại là dựa theo cấu trúc được yêu cầu (vd: `assets/images/bo-suu-tap/cat1.jpg`). Bạn cần đảm bảo các file ảnh này có sẵn trong thư mục.
3. **Đánh giá khách hàng**: Đã tạo file `data/reviews.json` với nội dung `TODO_XAC_NHAN`. Bạn có thể thay đổi trong file này.
4. **Các trang phụ**: `san-pham`, `bo-suu-tap`, `ve-chung-toi`, `tin-tuc` chưa được dựng chi tiết trong scope này.
5. **Tìm kiếm**: Biểu tượng tìm kiếm trên header hiện tại chưa có chức năng.
6. **Link Footer**: Một số link hướng dẫn chọn size, chính sách chưa có link thực tế.

## Ánh xạ cột CSV trong Node.js Script
- `id` -> `id`
- `ten_san_pham` -> `name`
- `slug` -> `slug`
- `bo_suu_tap` -> `collection`
- `gia` -> `price` (đã bỏ dấu chấm và chuyển về dạng số)
- `mo_ta_ngan` -> `shortDescription`
- `mo_ta_chi_tiet` -> `detailDescription`
- `thong_so` -> `specs`
- `ten_file_anh` -> `image` (tự động thêm prefix `assets/images/san-pham/`)
- `link_tiktok_shop` -> `tiktokLink`
