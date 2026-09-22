const fs = require('fs');
const path = require('path');
const https = require('https');

const images = {
    'bo-suu-tap/summer-set.jpg': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
    'bo-suu-tap/polo-set.jpg': 'https://images.unsplash.com/photo-1622519407650-3df9883f76a5?auto=format&fit=crop&w=800&q=80',
    'bo-suu-tap/bloom-set.jpg': 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=800&q=80',
    'bo-suu-tap/cler-set.jpg': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80',
    'bo-suu-tap/sporty-set.jpg': 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=800&q=80',
    'bo-suu-tap/pickleball-set.jpg': 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&w=800&q=80',
    'san-pham/sp1.jpg': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
    'san-pham/sp2.jpg': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80', // reusing for now
    'san-pham/sp3.jpg': 'https://images.unsplash.com/photo-1622519407650-3df9883f76a5?auto=format&fit=crop&w=800&q=80',
    'san-pham/sp4.jpg': 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=800&q=80',
    'san-pham/sp5.jpg': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80',
    'san-pham/sp6.jpg': 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&w=800&q=80',
    'tin-tuc/news-1.jpg': 'https://images.unsplash.com/photo-1618220179428-22790b46a0eb?auto=format&fit=crop&w=800&q=80', // Fabric
    'tin-tuc/news-2.jpg': 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&w=800&q=80', // Tennis/Pickleball
    'khac/about-hero.jpg': 'https://images.unsplash.com/photo-1618220179428-22790b46a0eb?auto=format&fit=crop&w=1200&q=80'
};

const download = (url, dest) => {
    return new Promise((resolve, reject) => {
        const fullPath = path.join(__dirname, '../assets/images', dest);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        
        const file = fs.createWriteStream(fullPath);
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                download(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(fullPath, () => reject(err));
        });
    });
};

async function run() {
    for (const [dest, url] of Object.entries(images)) {
        try {
            console.log(`Downloading ${dest}...`);
            await download(url, dest);
        } catch (e) {
            console.error(`Failed ${dest}: ${e.message}`);
        }
    }
    console.log('Done!');
}

run();
