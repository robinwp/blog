const fs = require('fs');
const path = require('path');
const cssFilePath = path.resolve(__dirname, '../book/gitbook/style.css');
if(fs.existsSync(cssFilePath)){
  fs.appendFileSync(cssFilePath,'.gitbook-link{display: none !important;}');
}
