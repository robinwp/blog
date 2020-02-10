# 通过手撸学习tapable

[tapable](https://github.com/webpack/tapable)是什么？我的理解是一个提供了多种方式使用发布订阅模式的库

通过tap、tapAsync、tapPromise分别添加同步，异步回调，异步promise类型的事件。通过call，callAsync，promise触发对应的事件。

tapable提供了以下9种Hook，我们来手撸一遍，看一下tapable的庐山真面目。

1. SyncHook
2. SyncBailHook
3. SyncWaterfallHook
4. SyncLoopHook
5. AsyncParallelHook
6. AsyncParallelBailHook
7. AsyncSeriesHook
8. AsyncSeriesBailHook
9. AsyncSeriesWaterfallHook


### SyncHook

实现：
```js
class SyncHook {
  constructor () {
    this.tasks = [];
  }

  tap (name, task) {
    this.tasks.push(task);
  }

  call (...args) {
    this.tasks.forEach((taks) => {
      taks(...args);
    });
  }
}
```

例子：
```js
const init = new SyncHook();
init.tap('init', (arg)=> {
  // do something
});
init.call('arg');
```


### SyncBailHook

返回值不是undefined，则停止

```js
class SyncBailHook {
  constructor () {
    this.tasks = [];
  }

  tap (name, task) {
    this.tasks.push(task);
  }

  call (...args) {
    let index = 0;
    let res;
    do {
      res = this.tasks[i++](...args);
    } while (res === undefined && index < this.tasks.length);
  }
}
```

### SyncWaterfallHook

请一个函数执行的结果是，下一个函数的入参

```js
class SyncWaterfallHook {
  constructor () {
    this.tasks = [];
  }

  tap (name, task) {
    this.tasks.push(task);
  }

  call (...args) {
    const [first, ...others] = this.tasks;
    others.reduce((a, b) => {
      return b(a);
    }, first(...args));
  }
}
```


### SyncLoopHook

返回值不是undefined，则继续执行此函数。否则执行下一个

```js
class SyncLoopHook {
  constructor () {
    this.tasks = [];
  }

  tap (name, task) {
    this.tasks.push(task);
  }

  call (...args) {
    this.tasks.forEach((task) => {
      let res;
      do {
        res = task(...args);
      } while (res === undefined);
    });
  }
}
```

### AsyncParallelHook

异步并发

```js
class AsyncParallelHook {
  constructor () {
    this.tasks = [];
    this.asyncTasks = [];
    this.promiseTasks = [];
  }

  tap (name, task) {
    this.tasks.push(task);
  }

  call () {
    this.tasks.forEach((taks) => {
      taks(...args);
    });
  }

  tapAsync (name, task) {
    this.asyncTasks.push(task);
  }

  callAsync (...args) {
    const finalCallback = args.pop();
    let index = 0;

    function done () {
      index++;
      if (index === this.asyncTasks.length) {
        finalCallback();
      }
    }

    this.asyncTasks.forEach((taks) => {
      taks(...args, done.call(this));
    });
  }

  tapPromise (name, task) {
    this.promiseTasks.push(task);
  }

  promise (...args) {
    const list = this.promiseTasks.map(task => task(...args));
    return Promise.all(list);
  }

}
```

### AsyncParallelBailHook

异步并发，返回值不是undefined，则停止。

我懒得写了，自己动手写吧。


### AsyncSeriesHook

异步串行

```js
class AsyncSeriesHook {
  constructor () {
    this.tasks = [];
  }

  tapAsync (name, task) {
    this.tasks.push(task);
  }

  callAsync (...args) {
    let index = 0;
    const tasks = this.tasks;
    const next = () => {
      if (index === tasks.length) {
        return;
      }
      tasks[index++](...args, next);
    };
    next();
  }
}
```


### AsyncSeriesBailHook

异步串行带保险的钩子

我懒得写了，自己动手写吧。


### AsyncSeriesWaterfallHook

异步串行的瀑布钩子

```js
class AsyncSeriesWaterfallHook {
  constructor () {
    this.tasks = [];
  }

  tapAsync (name, task) {
    this.tasks.push(task);
  }

  callAsync (...args) {
    const finalCallback = args.pop();
    let index = 0;
    const next = (err, result) => {
      index++;
      if (err || index === this.tasks.length) {
        finalCallback();
        return;
      }
      this.tasks[index++](result, next);
    };
    next(null, ...args);
  }
}
```

没写的时候，不就是9个函数嘛，撸一遍就是了。一写起来，怎么这么多。
