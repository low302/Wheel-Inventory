const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Clean build directory
const buildDir = path.join(__dirname, 'build');
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true });
}
fs.mkdirSync(buildDir);

// Copy public files
const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir);
files.forEach(file => {
  fs.copyFileSync(
    path.join(publicDir, file),
    path.join(buildDir, file)
  );
});

// Bundle with esbuild
esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  minify: true,
  sourcemap: false,
  outfile: 'build/bundle.js',
  loader: {
    '.js': 'jsx',
    '.jsx': 'jsx'
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
}).then(() => {
  // Update HTML to reference bundle
  const htmlPath = path.join(buildDir, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = html.replace('</body>', '<script src="/bundle.js"></script></body>');
  fs.writeFileSync(htmlPath, html);
  
  console.log('✅ Build completed successfully!');
  console.log(`📦 Output: ${buildDir}`);
}).catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
