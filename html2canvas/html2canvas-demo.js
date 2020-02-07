(function (global) {
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

  function setCssStyle (node, zoom) {
    if (node.children && node.children.length > 0) {
      for (let i = 0, size = node.children.length; i < size; i++) {
        setCssStyle(node.children.item(i));
      }
    }
    const style = getComputedStyle(node, null);
    // for (let i = 0, size = style.length; i < size; i++) {
    //   const key = style[i];
    //   node.style[key] = style.getPropertyValue(key);
    // }
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
      const svgstring = new XMLSerializer().serializeToString(svg);
      img.src = `data:image/svg+xml;base64,${ btoa(unescape(encodeURIComponent(svgstring))) }`;
    });
  }

  function download (blob, fileName, callback) {
    if (navigator.msSaveOrOpenBlob) {
      // IE 或者 Edeg
      navigator.msSaveOrOpenBlob(blob, fileName);
      if (callback) callback();
      return;
    }
    const tmpa = document.createElement('a');
    tmpa.style.display = 'none';
    tmpa['href-lang'] = 'image/svg+xml';
    tmpa.download = fileName || `${ new Date().getTime() }.png`;
    tmpa.href = URL.createObjectURL(blob); // 绑定a标签
    tmpa.target = '_blank';
    // firefox 需要添加到html文档中
    document.body.appendChild(tmpa);
    tmpa.click(); // 模拟点击实现下载
    setTimeout(function () { // 延时释放
      document.body.removeChild(tmpa);
      URL.revokeObjectURL(tmpa.href); // 用URL.revokeObjectURL()来释放这个object URL
      if (callback) callback();
    }, 100);
  }

  global.picture = {
    html2svg,
    svg2img,
    setCssStyle,
    download,
  };
})(this);
