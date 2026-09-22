const fs = require('fs');
const path = require('path');

const csvFilePath = path.join(__dirname, '../data/san-pham.csv');
const jsonFilePath = path.join(__dirname, '../data/products.json');

// Hàm parse CSV hỗ trợ newline và comma trong ngoặc kép
function parseCSV(text) {
    const lines = [];
    let currentLine = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentCell += '"';
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentLine.push(currentCell);
            currentCell = '';
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
            if (char === '\r') i++; // Skip \n
            currentLine.push(currentCell);
            lines.push(currentLine);
            currentLine = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    
    if (currentCell !== '' || currentLine.length > 0) {
        currentLine.push(currentCell);
        lines.push(currentLine);
    }

    return lines;
}

try {
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    const parsedData = parseCSV(csvData);
    
    if (parsedData.length < 2) {
        console.log('CSV file is empty or only has headers.');
        process.exit(0);
    }

    const headers = parsedData[0].map(h => h.trim());
    
    const products = [];
    
    for (let i = 1; i < parsedData.length; i++) {
        const row = parsedData[i];
        // Skip empty rows
        if (row.length === 1 && row[0].trim() === '') continue;

        const product = {};
        headers.forEach((header, index) => {
            product[header] = row[index] ? row[index].trim() : '';
        });

        // Ánh xạ các trường
        const mappedProduct = {
            id: product['id'],
            name: product['ten_san_pham'],
            slug: product['slug'],
            collection: product['bo_suu_tap'],
            // Chuyển giá thành số (bỏ dấu chấm)
            price: product['gia'] ? parseInt(product['gia'].replace(/\./g, ''), 10) : null,
            shortDescription: product['mo_ta_ngan'],
            detailDescription: product['mo_ta_chi_tiet'],
            specs: product['thong_so'],
            image: product['ten_file_anh'] ? `assets/images/san-pham/${product['ten_file_anh']}` : '',
            tiktokLink: product['link_tiktok_shop'],
            
            // Các trường còn thiếu theo yêu cầu (để TODO)
            isFeatured: "TODO", // Không có cờ đánh dấu nổi bật trong CSV
            label: "TODO", // Nhãn NEW/BESTSELLER/SIGNATURE
            category: "TODO", // Danh mục chung chung
        };

        products.push(mappedProduct);
    }

    fs.writeFileSync(jsonFilePath, JSON.stringify(products, null, 2), 'utf8');
    console.log(`Successfully converted ${products.length} products to JSON.`);
    console.log(`Saved to ${jsonFilePath}`);

} catch (error) {
    console.error('Error processing CSV:', error);
}
