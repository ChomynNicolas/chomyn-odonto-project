const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// URLs directas de Google Fonts para Outfit (formato variable font)
// Usamos la fuente variable que contiene todos los pesos
const fontFiles = [
  { weight: '100', name: 'Outfit-Thin', url: 'https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1C4G-EiAou6Y.ttf' },
  { weight: '200', name: 'Outfit-ExtraLight', url: 'https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1C4G-EiAou6Y.ttf' },
  { weight: '300', name: 'Outfit-Light', url: 'https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1C4G-EiAou6Y.ttf' },
  { weight: '400', name: 'Outfit-Regular', url: 'https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1C4G-EiAou6Y.ttf' },
  { weight: '500', name: 'Outfit-Medium', url: 'https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1C4G-EiAou6Y.ttf' },
  { weight: '600', name: 'Outfit-SemiBold', url: 'https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1C4G-EiAou6Y.ttf' },
  { weight: '700', name: 'Outfit-Bold', url: 'https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1C4G-EiAou6Y.ttf' },
  { weight: '800', name: 'Outfit-ExtraBold', url: 'https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1C4G-EiAou6Y.ttf' },
  { weight: '900', name: 'Outfit-Black', url: 'https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1C4G-EiAou6Y.ttf' },
];

const fontsDir = path.join(__dirname, '..', 'src', 'fonts');

// Crear directorio si no existe
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

async function getFontUrls() {
  return new Promise((resolve, reject) => {
    const cssUrl = 'https://fonts.googleapis.com/css2?family=Outfit:wght@100;200;300;400;500;600;700;800;900&display=swap';
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    https.get(cssUrl, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        // Buscar todas las URLs woff2
        const urls = [];
        const regex = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/g;
        let match;
        
        while ((match = regex.exec(data)) !== null) {
          urls.push(match[1]);
        }
        
        // También buscar ttf como fallback
        if (urls.length === 0) {
          const ttfRegex = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.ttf)\)/g;
          while ((match = ttfRegex.exec(data)) !== null) {
            urls.push(match[1]);
          }
        }
        
        resolve(urls);
      });
    }).on('error', reject);
  });
}

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    https.get(options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      const fileStream = fs.createWriteStream(filepath);
      res.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function downloadAllFonts() {
  console.log('Descargando fuentes Outfit desde Google Fonts...\n');
  
  try {
    // Obtener URLs desde el CSS
    console.log('Obteniendo URLs de fuentes...');
    const urls = await getFontUrls();
    
    if (urls.length === 0) {
      throw new Error('No se encontraron URLs de fuentes en el CSS de Google Fonts');
    }
    
    console.log(`Encontradas ${urls.length} variantes de fuente\n`);
    
    // Si solo hay una URL (fuente variable), descargarla una vez
    if (urls.length === 1) {
      console.log('Detectada fuente variable, descargando...');
      const url = urls[0];
      const filename = 'Outfit-Variable.woff2';
      const filepath = path.join(fontsDir, filename);
      
      await downloadFile(url, filepath);
      console.log(`✓ ${filename} descargado\n`);
      
      // Crear enlaces simbólicos o copias para cada peso
      console.log('Creando archivos para cada peso...');
      for (const font of fontFiles) {
        const targetPath = path.join(fontsDir, `${font.name}.woff2`);
        if (!fs.existsSync(targetPath)) {
          fs.copyFileSync(filepath, targetPath);
          console.log(`✓ ${font.name}.woff2 creado`);
        }
      }
    } else {
      // Descargar cada variante
      for (let i = 0; i < fontFiles.length && i < urls.length; i++) {
        const font = fontFiles[i];
        const url = urls[i];
        const filename = `${font.name}.woff2`;
        const filepath = path.join(fontsDir, filename);
        
        console.log(`Descargando ${filename} (peso ${font.weight})...`);
        await downloadFile(url, filepath);
        console.log(`✓ ${filename} descargado`);
      }
    }
    
    console.log('\n✓ Todas las fuentes descargadas exitosamente!');
  } catch (error) {
    console.error('\n✗ Error al descargar fuentes:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

downloadAllFonts();

