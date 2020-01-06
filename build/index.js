const fs = require('fs');
const path = require('path');
const htmlparser = require('parse5');

const cssFilePath = path.resolve(__dirname, '../book/gitbook/style.css');
if (fs.existsSync(cssFilePath)) {
  fs.appendFileSync(cssFilePath, '.gitbook-link{display: none !important;}');
}

const indexFilePath = path.resolve(__dirname, '../book/index.html');
if (fs.existsSync(indexFilePath)) {
  const fileData = fs.readFileSync(indexFilePath, { encoding: 'utf8' });
  const htmlDom = htmlparser.parse(fileData, {sourceCodeLocationInfo: true});
  const htmlTag = htmlDom.childNodes.find(item => item.nodeName === 'html');
  const headTag = htmlTag.childNodes.find(item => item.nodeName === 'head');
  const offset  = headTag.sourceCodeLocation.startTag.endOffset;
  const result = `${fileData.substring(0, offset)}<meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Cache-Control" content="no-cache"><meta http-equiv="Expires" content="0"><meta http-equiv="Cache" content="no-cache">${fileData.substring(offset)}`
  fs.writeFileSync(indexFilePath, result);
}
