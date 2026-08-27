const fs = require('fs');
const path = require('path');

const imgPath = path.join(__dirname, 'Image', 'Image.jpeg');
const imgBuf = fs.readFileSync(imgPath);
const b64 = 'data:image/jpeg;base64,' + imgBuf.toString('base64');

const jsContent = `// Base64 template data for CORS-free local canvas execution
const TEMPLATE_BASE64 = ${JSON.stringify(b64)};
`;

fs.writeFileSync(path.join(__dirname, 'Image', 'image_data.js'), jsContent);
console.log('Successfully updated image_data.js with Image.jpeg. Base64 length:', b64.length);
