# html2canvas原理

有时候我们会碰到将部分的网页下载成图片的需求，我们会使用html2canvas将网页转换成图片，再将图片下载下来。那么大家知道html2canvas是如何将网页转换成图片的吗？
原理是先将html转成svg，在将svg转成img，最后将img绘制到canvas上。这样就可以下载图片了。

[演示地址](https://robinwp.github.io/blog/html2canvas/)

### [foreignObject](https://developer.mozilla.org/zh-CN/docs/Web/SVG/Element/foreignObject)

foreignObject是svg中一个特殊的元素。它允许在浏览器的上下文中，包含不同的XML命名空间，比如XHTML / HTML。
所以我们只要将html元素，原封不动的复制到foreignObject元素中，就可以获得一个svg了。

请看下面的例子：

```js

function html2svg (width, height, x, y, node) {
    const xmlns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(xmlns, 'svg');
    const foreignObject = document.createElementNS(xmlns, 'foreignObject');
    svg.setAttributeNS(null, 'width', width.toString());
    svg.setAttributeNS(null, 'height', height.toString());

    foreignObject.setAttributeNS(null, 'width', '100%');
    foreignObject.setAttributeNS(null, 'height', '100%');
    foreignObject.setAttributeNS(null, 'x', x.toString());
    foreignObject.setAttributeNS(null, 'y', y.toString());
    foreignObject.setAttributeNS(null, 'externalResourcesRequired', 'true');
    svg.appendChild(foreignObject);
    foreignObject.appendChild(node);
    return svg;
}

const warp = document.getElementById('warp');
const warpClone = warp.cloneNode(true);
const zoom = parseInt(input.value) || 1;
const svg = picture.html2svg((warp.offsetWidth * zoom) + 10, (warp.offsetHeight * zoom) + 10, 5, 5, warpClone);
document.body.appendChild(svg);

```

### svg2img

想必很多同学已经想到了，image元素本来就是支持svg的。我们只要注意一点，html元素中的class样式，不要弄丢就可以了。

首先遍历html，然后使用[getComputedStyle](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/getComputedStyle)方法获取到html元素的样式。接下来设置到svg中，最后将svg转换成img/

例子：
```js

function setCssStyle (node, zoom) {
    if (node.children && node.children.length > 0) {
      for (let i = 0, size = node.children.length; i < size; i++) {
        setCssStyle(node.children.item(i));
      }
    }
    // 第二个参数可以获取指定伪类的样式
    const style = getComputedStyle(node, null);
    node.style.cssText = style.cssText;
    node.style.transformOrigin = '0 0';
    node.style.transform = `scale(${ zoom })`;
    node.className = '';
}

function svg2img (svg) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = `data:image/svg+xml;charset=utf-8,${ encodeURIComponent(new XMLSerializer().serializeToString(svg)) }`;
    });
}

```

### 将img绘制到canvas中并下载

直接上代码

```js

const canvas = document.createElement('canvas');
canvas.width = img.width;
canvas.height = img.height;
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0);
// 默认是png格式
canvas.toBlob((blob) => {
  // 下载blob
  download(blob);
});
```

谢谢阅读
