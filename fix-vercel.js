import fs from 'fs';
import path from 'path';

const configPath = path.resolve('.vercel/output/config.json');
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  // Force Vercel to route to index.html for non-API requests
  if (config.routes) {
    config.routes.unshift({ "src": "^/(?!api).*$", "dest": "/index.html" });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("Patched Vercel config.json to prioritize index.html");
  }
}
