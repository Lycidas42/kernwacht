// Erzeugt eine eigenständige Einzeldatei (core.js eingebettet, ohne PWA-Teile),
// z. B. zum Teilen als Datei oder für die Claude-Artifact-Vorschau.
// Aufruf: node tools/build-single.js  ->  dist/kernwacht.html
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const core = fs.readFileSync(path.join(root, 'core.js'), 'utf8');
html = html.replace('<script src="core.js"></script>', () => '<script>\n' + core + '\n</script>');
html = html.replace(/<link rel="manifest"[^>]*>\n?/, '').replace(/<link rel="(icon|apple-touch-icon)"[^>]*>\n?/g, '');
html = html.replace(/<script>\s*\/\/ Service Worker[\s\S]*?<\/script>\n?/, '');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'kernwacht.html'), html);
console.log('dist/kernwacht.html', (html.length / 1024).toFixed(1), 'KB');
