const fs = require('fs');
const file = 'src/app/tools/base64/page.tsx';
let content = fs.readFileSync(file, 'utf-8');
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');
content = content.replace(/\\\\s/g, '\\s');
fs.writeFileSync(file, content);
