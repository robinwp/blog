# 如何优雅的实现express中间件的热跟新
> 作者： robin  
> 时间：2020.01.06  
> 邮箱：284595745@qq.com
> 优雅的代码和优雅的我

在日常的开发中，大家是否也有碰到过，需要修改http-proxy-middleware代理设置，但是需要重新启动项目，等待几分钟的情况呢。
那有没有什么办法可以让http-proxy-middleware也可以实现热更新呢。

### 监听文件变化
既然要实现热更新，首先肯定是监听文件的变化了。我们使用[**fs.watch**](http://nodejs.cn/api/fs.html#fs_fs_watch_filename_options_listener)来监听文件的修改。

例子：
```js
fs.watch('proxy.js', (event) => {
    if (event === 'change') {
      console.log('proxy.js 文件改变');
    }
  });
```

### express 中间件原理

中间件其实就是一个函数，使用了职责链（责任链）模式实现的，express维护了一个中间件列表，前一个中间件执行完成后，调用next，就会执行下一个中间件。


例子：
```js
function MiddlewareDemo(){
	if(!(this instanceof MiddlewareDemo)){
	   return new MiddlewareDemo();
	}
}

MiddlewareDemo.prototype = {
	_middlewareList: [],
	use(middleware){
		// 此处省略了路由地址参数
		if(Array.isArray(middleware)){
			this._middlewareList = this._middlewareList.concat(middleware)
		} else {
			this._middlewareList.push(middleware)
		}
	},
	start(req, res){
		let i = 0;
		const _next = () =>{
			const task = this._middlewareList[i++];
			if(task){
				task(req, res, _next);
			}
		};
		_next();
	}
};


const middlewareInstance = new MiddlewareDemo();

middlewareInstance.use(function(req, res, next){
	console.log(1);
	next();
	console.log(2);
});

middlewareInstance.use(function(req, res, next){
	console.log(3);
	next();
	console.log(4);
});

middlewareInstance.use(function(req, res, next){
	console.log(5);
	next();
	console.log(6);
});
middlewareInstance.start(); // 1 3 5 6 4 2
```

### 实现动态修改express中间件

知道了中间件实现原理后，我们只要修改了， express维护中间件的列表就可以了。

例子：
```js
for (let i = 0; i < app._router.stack.length;  i++) {
    if(app._router.stack[i].name === 'router') {
      console.log(app._router.stack[i].name);     
      app._router.stack.splice(i, 1);
      console.log(app._router.stack);          
      break;   
    }
}
```

### 如何优雅的实现

虽然上面的方法的可以实现这个需求。请看我们的标题，如何**优雅的**实现express中间件的热跟新。作为一个优雅的程序猿，怎么允许代码不优雅呢。  

例子：
```js
const middlewareList = [];
middlewareList.push(function(req, res, next){
	console.log(1);
	next();
	console.log(2);
});

middlewareList.push(function(req, res, next){
	console.log(3);
	next();
	console.log(4);
});

middlewareList.push(function(req, res, next){
	console.log(5);
	next();
	console.log(6);
});

function entries(list, fn, next){
	let i = 0;
	const _next = () =>{
		const task = list[i++];
		if(task){
			fn(task, _next);
		}
	};
	_next();

    if (next) {
      next();
    }
}

middlewareInstance.use(function(req, res, next){
  entries(middlewareList, (handler, callback) =>{
    handler(req, res, callback);
  }, next)
});
middlewareInstance.use(function(req, res, next){
	console.log('end');
});
middlewareInstance.start(); // 1 3 5 6 4 2 end

middlewareList[1] = function(req, res, next){
	console.log(3);
	// next();
	console.log(4);
};
middlewareInstance.start();// 1 3 4 2 end

```
> 啊，我这该死的优雅（偷笑）

### 结合http-proxy-middleware在webpack中的使用

例子：

```js
// proxy.js
module.exports = {
  '/proxy': {
    target: 'https://www.baidu.com',
    changeOrigin: true,
    pathRewrite: {
      '^/proxy': ''
    }
  },
};
```

```js
// webpack.dev.conf.js
const proxyMiddleware = require('http-proxy-middleware');

function proxy(){
  const proxyConfig = fs.readFileSync(path.resolve(__dirname,'./proxy.js'), 'utf-8');
  const proxyTable  = eval(proxyConfig);
  return Object.keys(proxyTable).map(function (context) {
    let options = proxyTable[context];
    if (typeof options === 'string') {
      options = { target: options }
    }
    return proxyMiddleware(options.filter || context, options);
  });
}

module.exports = {
 devServer: {
    after: function (app) {
      let proxyMiddlewareList = proxy();

      function entries(list, fn, next){
      	let i = 0;
      	const _next = () =>{
      		const task = list[i++];
      		if(task){
      			fn(task, _next);
      		}
      	};
      	_next();

        if (next) {
          next();
        }
      }

      app.use(function(req, res, next){
        entries(proxyMiddlewareList, (handler, callback) =>{
          handler(req, res, callback);
        }, next);
      });
      console.log('开始监听：proxy.js的变化');
      fs.watch(path.resolve(__dirname, './'), (event, filename) => {
        if (event === 'change' && filename === 'proxy.js') {
          console.log('proxy.js 文件改变');
          proxyMiddlewareList = proxy();
          console.log('重新设置 http-proxy-middleware');
        }
      });
    }
  }
}
```

### 结束语
既然已经优雅的实现了express中间件的热跟新，那么路由的热跟新还难吗？毕竟原理是一样的

谢谢阅读

相关资料
* [JavaScript设计模式 张容铭](http://product.dangdang.com/23753847.html)
* [express](https://github.com/expressjs/express)
