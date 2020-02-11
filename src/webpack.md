# 通过手撸学习webpack4

[完整代码](https://github.com/robinwp/robin-pack)

平时的工作中，我们都离不开webpack帮助我们构建应用，今天我们来分析一下webpack的工作原理，并且手撸一个简单版的webpack

### webpack4 原理分析

我们都知道webpack是一个打包工具，假设我们有一下3个文件，那么经过webpack打包后，会变成什么样呢。

```js
// a.js
module.exports = function() {
  console.log('A');
}
```

```js
// b.js
module.exports = function() {
  console.log('B');
}
```

```js
// index.js
const a = require('./a.js');
const b = require('./b.js');

console.log('index');
a();
b();
```

```js
// webpack.config.js
module.exports = {
  mode: 'development'
}
```
删掉多余的代码和无用的注释后，打包结果如下
```js
// 打包结果
 (function(modules) { // webpackBootstrap
 	// The module cache
 	var installedModules = {};
 	// The require function
 	function __webpack_require__(moduleId) {

 		// Check if module is in cache
 		if(installedModules[moduleId]) {
 			return installedModules[moduleId].exports;
 		}
 		// Create a new module (and put it into the cache)
 		var module = installedModules[moduleId] = {
 			i: moduleId,
 			l: false,
 			exports: {}
 		};

 		// Execute the module function
 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

 		// Flag the module as loaded
 		module.l = true;

 		// Return the exports of the module
 		return module.exports;
 	}
 	// Load entry module and return exports
 	return __webpack_require__("./src/index.js");
 })
 ({
"./src/a.js":
 (function(module, exports) {

eval("module.exports = function () {\n  console.log('A');\n};\n\n\n//# sourceURL=webpack:///./src/a.js?");
 }),

"./src/b.js":
(function(module, exports) {

eval("module.exports = function () {\n  console.log('B');\n};\n\n\n//# sourceURL=webpack:///./src/b.js?");
}),

"./src/index.js":
(function(module, exports, __webpack_require__) {

eval("const a = __webpack_require__(/*! ./a */ \"./src/a.js\");\nconst b = __webpack_require__(/*! ./b */ \"./src/b.js\");\n\nconsole.log('index');\na();\nb();\n\n\n//# sourceURL=webpack:///./src/index.js?");
})

 });
```
分析上面的js后，我们发现我们写的代码变成了下面的对象，成为了自执行函数的入参
并且，a.js和b.js的内容没有变，内容作为eval的入参。index.js 中```require```变成了```__webpack_require__```, ```./a.js```变成了```./src/a.js```

```
{
"./src/a.js":
 (function(module, exports) {

eval("module.exports = function () {\n  console.log('A');\n};\n\n\n//# sourceURL=webpack:///./src/a.js?");
 }),

"./src/b.js":
(function(module, exports) {

eval("module.exports = function () {\n  console.log('B');\n};\n\n\n//# sourceURL=webpack:///./src/b.js?");
}),

"./src/index.js":
(function(module, exports, __webpack_require__) {

eval("const a = __webpack_require__(/*! ./a */ \"./src/a.js\");\nconst b = __webpack_require__(/*! ./b */ \"./src/b.js\");\n\nconsole.log('index');\na();\nb();\n\n\n//# sourceURL=webpack:///./src/index.js?");
})
}
```

分析 ```__webpack_require__```函数，发现核心就是下面这行代码。根据moduleId拿到module。
```js

modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
```
通过webpack打包后的js，会返回入口文件的模块

```return __webpack_require__("./src/index.js");```

#### 总结：

1. webpack会将js文件中的require，修改成```__webpack_require__```。
2. webpack会为每个js文件生成以下这样的键值对，key是文件的路径（moduleId），value是一个执行eval的方法，里面是js文件的内容
```
"./src/index.js":
(function(module, exports, __webpack_require__) {
    eval("const a = __webpack_require__(/*! ./a */ \"./src/a.js\");\nconst b = __webpack_require__(/*! ./b */ \"./src/b.js\");\n\nconsole.log('index');\na();\nb();\n\n\n//# sourceURL=webpack:///./src/index.js?");
})
```

3. 生成打包后的js文件，实现```__webpack_require__```的功能（根据moduleId加载对应的模块，并缓存），返回入口模块

### 实现webpack打包

新建项目，package.json中添加

```json
{
  "bin": {
    "robin-pack": "./bin/index.js"
  }
}
```
入口文件
```
// bin/index.js

#! /usr/bin/env node
const Compiler = require('../lib/Compiler.js');
const path = require('path');
// 读取配置文件
const configPath = path.resolve(process.cwd(), './pack.config.js');

const config = require(configPath);
// 创建编译器
const compiler = new Compiler(config);
// 运行
compiler.run();

```
创建Compiler文件
```js
// lib/Compiler.js

const path = require('path');
const fs = require('fs');
// 将js解析成AST
const parser = require('@babel/parser');
const t = require('@babel/types');
// 根据AST生成js
const generator = require('@babel/generator').default;
// 修改AST内容 
const traverse = require('@babel/traverse').default;
const fsExtra = require('fs-extra');
const requireName = '__robin_pack_require__';
const template = require('./template'); // 生成最终打包好的文件模板

class Compiler {
  constructor (config) {
    this.config = config;
    this.modules = {}; // 存放所有的模块
    this.entryId = ''; // 打包的入口文件
    this.root = process.cwd(); // 运行的项目根目录
  }

  buildMoudle (modulePath, isEntry) {
    // 读取文件内容
    let source = fs.readFileSync(path.resolve(this.root, modulePath), 'utf8');
    if (isEntry) {
      // 如果是入口文件，设置 entryId
      this.entryId = modulePath;
    }
    // 解析文件内容，返回 将处理好的内容和需要的依赖
    const { sourceCode, dependencies } = this.parse(source, path.dirname(modulePath));
    dependencies.forEach((item) => {
      // 处理需要的依赖
      this.buildMoudle(item, false);
    });
    // 保存处理好的模块
    this.modules[modulePath] = sourceCode;
  }

  parse (source, parentPath) {
    // 将js源码转成AST
    const ast = parser.parse(source);
    const dependencies = [];
    // 修改AST中的 require部分
    // https://astexplorer.net/
    traverse(ast, {
      CallExpression: ({ node }) => {
        if (node.callee.name === 'require') {
          // 将 require 改成 requireName 定义的名称
          node.callee.name = requireName;
          // 获取到 require('./a.js') 中的 ./a.js 
          let moduleName = node.arguments[0].value;
          // 没有.js后缀的加上.js
          moduleName += path.extname(moduleName) ? '' : '.js';
          // 拼接成 ./src/a.js
          moduleName = './' + path.join(parentPath, moduleName);
          // 放入依赖项中
          dependencies.push(moduleName);
          // 修改 ./a.js 为 ./src/a.js
          node.arguments = [t.stringLiteral(moduleName)];
        }
      },
    });
    return {
      // 将 AST 转成js返回
      sourceCode: generator(ast).code,
      dependencies,
    };
  }

  run () {
    this.buildMoudle(this.config.entry, true);
    this.emitFile();
  }

  emitFile () {
    // 根据保存的模块，生成最终的打包文件
    const content = template(requireName, this.entryId, this.modules);
    // 生成的文件输出地址
    const writePath = path.join(this.config.output.path, this.config.output.filename);
    if (!fsExtra.pathExistsSync(this.config.output.path)) {
      fsExtra.mkdirsSync(this.config.output.path);
    }
    fs.writeFileSync(writePath, content);
  }
}

module.exports = Compiler;
```
```js
// template.js
module.exports = function (__require__, entryId, modules) {
  const modulesTemp = Object.keys(modules).map((item) => {
    return `${ JSON.stringify(item) }: (function(module, exports, ${ __require__ }) {
        eval(${ JSON.stringify(modules[item]) });
      })`;
  }).join(',\r\n');


  return `(function(modules) {
  // The module cache
  var installedModules = {};
  // The require function
  function ${ __require__ }(moduleId) {
    // Check if module is in cache
    if(installedModules[moduleId]) {
      return installedModules[moduleId].exports;
    }
    // Create a new module (and put it into the cache)
    var module = installedModules[moduleId] = {
      i: moduleId,
      l: false,
      exports: {}
    };
    // Execute the module function
    modules[moduleId].call(module.exports, module, module.exports, ${ __require__ });
    // Flag the module as loaded
    module.l = true;
    // Return the exports of the module
    return module.exports;
  }
  // Load entry module and return exports
  return ${ __require__ }(${ JSON.stringify(entryId) });
})
({
  ${ modulesTemp }
});`;
};
```
配置文件
```js
// pack.config.js
const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, './dist'),
  },
};
```
### 增加plugin

> 使用了 tapable 库中的SyncHook类，tapable主要实现了发布订阅模式。[通过手撸学习tapable](tapable.md)

在 Compiler.js的构造函数中添加以下代码
```
// 定义了两个同步的钩子
this.hooks = {
  init: new SyncHook(),
  end: new SyncHook(),
};
// 从配置文件中获取到所有的插件
const plugins = this.config.plugins;
if (Array.isArray(plugins)) {
  plugins.forEach(item => {
    // 执行插件的apply方法
    item.apply(this);
  });
}
// 在构造函数的最后一行执行
this.hooks.init.call();
```

编写一个清空输出目录的插件

```js
// ClearPlugin.js

const fsExtra = require('fs-extra');
class ClearPlugin {
  constructor (path) {
    this.path = path;
  }

  apply (compliance) {
    compliance.hooks.init.tap('ClearPlugin', () => {
      fsExtra.removeSync(this.path);
    });
  }
}

module.exports = ClearPlugin;
```
修改配置文件
```js
// pack.config.js
const path = require('path');
const clearPlugin = require('clearPlugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, './dist'),
  },
  plugins: [
    new clearPlugin(path.resolve(__dirname, './dist')),
  ],
};
```

### 增加loader

webpack 只能处理js，要处理别的类型的文件，都是通过loader去实现的。

实现一个将css添加到html中的loader

```js
// pack.config.js
module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, './dist'),
  },
  module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            path.resolve(__dirname, 'style-loader.js'),
          ],
        },
      ]
  },
};
```

修改 Compiler.js的buildMoudle方法
```js
// Compiler.js
class Compiler {
  // 省略其余代码
  buildMoudle (modulePath, isEntry) {
      // 读取文件内容
      let source = fs.readFileSync(path.resolve(this.root, modulePath), 'utf8');
      if (isEntry) {
        // 如果是入口文件，设置 entryId
        this.entryId = modulePath;
      }
      // 根据loader的规则，匹配对应的模块
      // 应该取出匹配的所有规则，从最后一个开始执行，这里只取了第一个匹配的loader
      const rule = this.config.module.rules.find(item => item.test.test(modulePath));
      if (rule) {
        const { use } = rule; // 获取到loader具体的执行方法
        let len = use.length - 1;
        const loader = () => {
          if (len >= 0) {
            // 倒序执行loader
            source = require(use[len--])(source);
            loader();
          }
        };
        loader();
      }
      // 解析文件内容，返回 将处理好的内容和需要的依赖
      const { sourceCode, dependencies } = this.parse(source, path.dirname(modulePath));
      dependencies.forEach((item) => {
        // 处理需要的依赖
        this.buildMoudle(item, false);
      });
      // 保存处理好的模块
      this.modules[modulePath] = sourceCode;
    }
}
```
编写 style-loader.js
```js
// style-loader.js
function styleLoader (source) {
  return `var style = document.createElement('style');
  style.innerHTML = ${JSON.stringify(source)};
  document.head.appendChild(style);`
}
module.exports = styleLoader;

```
