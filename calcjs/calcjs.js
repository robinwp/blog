(function (global) {
  function getUuid () {
    return ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }));
  }

  function CalcNode (options) {
    if (this instanceof CalcNode) {
      this.uid = options.uid;
      this.type = options.type;
      this.value = options.value;
      this.leftChild = options.leftChild || null;
      this.rightChild = null;
      this.status = options.status || 0;
    } else {
      return new CalcNode(options);
    }
  }

  const keyWord = {
    END: -1, // 结束状态
    INIT: 0, // 初始值
    ADD_OPERATOR: 1, // 加
    SUB_OPERATOR: 2, // 减
    MUL_OPERATOR: 3, // 乘
    DIV_OPERATOR: 4, // 除
    LEFT_PAREN: 5, // 左括号
    RIGHT_PAREN: 6, // 右括号
    DIGIT: 7, // 数字
  };

  const scannerStatus = {
    INIT: 0, // 初始状态
    DIGIT: 1, // 数字状态
    DECIMAL: 2, // 小数状态
  };

  function isEnd (current) {
    return current === ' ' || current === undefined || current === '\n';
  }

  let index = 1;
  let index_pos = 0;

  function fmaError (lint_pos, mes, current, paren) {
    current = current ? current : '';
    mes = mes.replace(/\n/g, ' ');
    return `第${ index }行，第${ lint_pos - index_pos }列，语法错误${ paren ? (paren > 0 ? ('缺少' + paren + '右括号') : ('缺少' + Math.abs(paren) + '左括号')) : '' }。\n${ mes + current }\n${ mes.split('')
      .map(item => /[\u4e00-\u9fa5]+/.test(item) ? '  ' : ' ')
      .join('') + '^' }`;
  }

  function isDigit (value) {
    return /[0-9]/.test(value);
  }

  function getToken (line, lint_pos = 0, preToken) {
    const token = {
      key: keyWord.INIT,
      value: '',
      lint_pos: lint_pos,
    };
    let current;
    let status = scannerStatus.INIT;
    while (true) {
      current = line[lint_pos];
      if (current === '\n') {
        index++;
        index_pos = lint_pos;
      }
      if (status === scannerStatus.INIT) {
        if (current === ' ') {
          // 忽略空格
          lint_pos += 1;
          continue;
        } else if (current === '(') {
          token.value = current;
          token.key = keyWord.LEFT_PAREN;
          token.lint_pos = lint_pos + 1;
          return token;
        } else if (current === ')') {
          token.value = current;
          token.key = keyWord.RIGHT_PAREN;
          token.lint_pos = lint_pos + 1;
          return token;
        } else if (current === '+') {
          token.value = current;
          token.key = keyWord.ADD_OPERATOR;
          token.lint_pos = lint_pos + 1;
          return token;
        } else if (current === '-') {
          if ((preToken === keyWord.INIT ||
            preToken === keyWord.ADD_OPERATOR
            || preToken === keyWord.SUB_OPERATOR
            || preToken === keyWord.MUL_OPERATOR
            || preToken === keyWord.DIV_OPERATOR
            || preToken === keyWord.LEFT_PAREN) && isDigit(line[lint_pos + 1])) {
            status = scannerStatus.DIGIT;
            token.value += current;
            lint_pos += 1;
            continue;
          } else {
            token.value = current;
            token.key = keyWord.SUB_OPERATOR;
            token.lint_pos = lint_pos + 1;
            return token;
          }
        } else if (current === '*') {
          token.value = current;
          token.key = keyWord.MUL_OPERATOR;
          token.lint_pos = lint_pos + 1;
          return token;
        } else if (current === '/') {
          token.value = current;
          token.key = keyWord.DIV_OPERATOR;
          token.lint_pos = lint_pos + 1;
          return token;
        } else if (isDigit(current)) {
          status = scannerStatus.DIGIT;
          token.value += current;
          lint_pos += 1;
          continue;
        } else if (current === undefined) {
          token.key = keyWord.END;
          return token;
        } else if (current === '\n') {
          // 忽略回车
          lint_pos += 1;
          continue;
        } else {
          throw new Error(fmaError(lint_pos, line.substring(lint_pos - 15, lint_pos), line.substring(lint_pos, lint_pos + 15)));
        }
      } else if (status === scannerStatus.DIGIT || status === scannerStatus.DECIMAL) {
        if (isDigit(current)) {
          token.value += current;
          lint_pos += 1;
          continue;
        } else if (current === '.') {
          if (status === scannerStatus.DECIMAL) {
            throw new Error(fmaError(lint_pos, line.substring(lint_pos - 15, lint_pos), line.substring(lint_pos, lint_pos + 15)));
          }
          status = scannerStatus.DECIMAL;
          token.value += current;
          lint_pos += 1;
          continue;
        } else if (isEnd(current) || current === '+' || current === '-' || current === '*' || current === '/' || current === ')') {
          token.key = keyWord.DIGIT;
          token.lint_pos = lint_pos;
          return token;
        } else {
          throw new Error(fmaError(lint_pos, line.substring(lint_pos - 15, lint_pos), line.substring(lint_pos, lint_pos + 15)));
        }
      }
      // 兜底，反正没有处理到的情况
      throw new Error(fmaError(lint_pos, line.substring(lint_pos - 30, lint_pos), current));
    }
  }

  function parse (line, list) {
    let token = {
      key: '',
      value: '',
      lint_pos: 0,
    };
    index = 1;
    index_pos = 0;
    let preToken = keyWord.INIT;
    let paren = 0;
    while (true) {
      token = getToken(line, token.lint_pos, preToken);
      if (token.key === keyWord.END) {
        break;
      } else {
        if (token.key === keyWord.LEFT_PAREN) {
          paren += 1;
        }
        if (token.key === keyWord.RIGHT_PAREN) {
          paren -= 1;
        }
        const currentlintPos = token.lint_pos;
        const leftStr = line.substring(currentlintPos - 15 > 0 ? (currentlintPos - 15) : 0, currentlintPos - 1);
        const rightStr = line.substring(currentlintPos - 1, currentlintPos + 15);
        if ((preToken === keyWord.ADD_OPERATOR || preToken === keyWord.SUB_OPERATOR || preToken === keyWord.MUL_OPERATOR || preToken === keyWord.DIV_OPERATOR) && (token.key !== keyWord.DIGIT && token.key !== keyWord.LEFT_PAREN)) {
          // 加减乘除 后面必须是数字 或者 左括号
          throw new Error(fmaError(currentlintPos, leftStr, rightStr));
        } else if (preToken === keyWord.LEFT_PAREN && (token.key !== keyWord.DIGIT && token.key !== keyWord.LEFT_PAREN)) {
          // 左括号 后面必须是数字或者左括号
          throw new Error(fmaError(currentlintPos, leftStr, rightStr));
        } else if (preToken === keyWord.RIGHT_PAREN && (token.key !== keyWord.RIGHT_PAREN && token.key !== keyWord.ADD_OPERATOR && token.key !== keyWord.SUB_OPERATOR && token.key !== keyWord.MUL_OPERATOR && token.key !== keyWord.DIV_OPERATOR)) {
          // 右括号 后面必须是右括号或者 加减乘除
          throw new Error(fmaError(currentlintPos, leftStr, rightStr));
        } else if (preToken === keyWord.DIGIT && (token.key !== keyWord.ADD_OPERATOR && token.key !== keyWord.SUB_OPERATOR && token.key !== keyWord.MUL_OPERATOR && token.key !== keyWord.DIV_OPERATOR && token.key !== keyWord.RIGHT_PAREN)) {
          // 数字 后面必须是 加减乘除 或者 右括号
          throw new Error(fmaError(currentlintPos, leftStr, rightStr));
        } else if (preToken === keyWord.INIT && token.key !== keyWord.DIGIT && token.key !== keyWord.LEFT_PAREN && token.key !== keyWord.SUB_OPERATOR) {
          // 起始的 必须的数字 或者 左括号 或者 减号
          throw new Error(fmaError(currentlintPos, leftStr, rightStr));
        }
        preToken = token.key;
        list.push({
          type: token.key,
          value: token.value,
        });
      }
    }
    if (paren > 0) {
      throw new Error(fmaError(line.length, line.substring(line.length - 30, line.length), '', paren));
    } else if (paren < 0) {
      throw new Error(fmaError(0, '', line.substring(0, 30), paren));
    }
  }

  function main (source) {
    if (!source) {
      throw new Error('不允许为空');
    }
    index = 1;
    index_pos = 0;
    const list = [];
    const content = source.replace(/\r\n/g, '\n');
    parse(content, list);
    const last = list[list.length - 1];
    if (last.type === keyWord.ADD_OPERATOR || last.type === keyWord.SUB_OPERATOR || last.type === keyWord.MUL_OPERATOR || last.type === keyWord.DIV_OPERATOR) {
      throw new Error(fmaError(content.length, content.substring(content.length - 30, content.length), ''));
    }
    const tree = fatmatTree(list);
    if (!tree) {
      throw new Error('语法树解析失败，0x5');
    }
    const result = calc(tree);
    return {
      tree,
      list,
      result,
    };
  }

  function findRC (current) {
    if ((current.type === keyWord.ADD_OPERATOR || current.type === keyWord.SUB_OPERATOR || current.type === keyWord.MUL_OPERATOR || current.type === keyWord.DIV_OPERATOR) && !current.rightChild) {
      return current;
    } else if ((current.type === keyWord.ADD_OPERATOR || current.type === keyWord.SUB_OPERATOR || current.type === keyWord.MUL_OPERATOR || current.type === keyWord.DIV_OPERATOR) && current.rightChild) {
      return findRC(current.rightChild);
    }
    throw new Error('生成语法树出错, 0x4');
  }

  function fatmatTree (list, parenIdx = 0) {
    const cacheList = [];
    let current = null;
    for (let i = 0, size = list.length; i < size; i++) {
      if (list[i].type === keyWord.ADD_OPERATOR || list[i].type === keyWord.SUB_OPERATOR || list[i].type === keyWord.MUL_OPERATOR || list[i].type === keyWord.DIV_OPERATOR) {
        // 解析到  加减乘除
        if (current === null) {
          // 当前为空 设置二叉树根节点
          current = new CalcNode({
            uid: getUuid(),
            type: list[i].type,
            value: list[i].value,
          });
          if (cacheList.length) {
            // 设置 二叉树 左节点
            current.leftChild = cacheList.shift();
          }
        } else if (current.status === 1) {
          //当前的二叉树满了
          if ((current.type === keyWord.ADD_OPERATOR || current.type === keyWord.SUB_OPERATOR) && (list[i].type === keyWord.MUL_OPERATOR || list[i].type === keyWord.DIV_OPERATOR)) {
            // 如果 当前二叉树根节点是 加或者减
            // 将二叉树右节点 替换为当前词法块， 并且设置当前词法块的左节点 为原先二叉树的右节点
            current.rightChild = new CalcNode({
              uid: getUuid(),
              type: list[i].type,
              value: list[i].value,
              leftChild: current.rightChild,
            });
          } else {
            // 否则 将 二叉树替换为当前词法块， 并且设置当前词法的左节点为 原先的二叉树
            current = new CalcNode({
              uid: getUuid(),
              type: list[i].type,
              value: list[i].value,
              leftChild: current,
            });
          }
          current.status = 0;
        } else if (current.status === 0) {
          // 当前二叉树没有满
          const now = findRC(current); // 寻找二叉树右侧是空的节点
          // 插入到空的地方
          now.rightChild = new CalcNode({
            uid: getUuid(),
            type: list[i].type,
            value: list[i].value,
          });
          now.status = 1;
          current.status = 1;
        }
      } else if ((current === null || current.status === 1) && list[i].type === keyWord.DIGIT) {
        // 解析到 数字
        // 二叉树满了，或者 二叉树不存在
        cacheList.push(list[i]);
      } else if (list[i].type === keyWord.DIGIT && current && current.status === 0) {
        // 解析到 数字
        // 二叉树没满
        const now = findRC(current); // 寻找二叉树右侧是空的节点
        // 插入到空的地方
        now.rightChild = new CalcNode({
          uid: getUuid(),
          type: list[i].type,
          value: list[i].value,
        });
        now.status = 1;
        current.status = 1;
      } else if (list[i].type === keyWord.LEFT_PAREN) {
        // 解析到 左括号
        if (!current) {
          // 特殊处理 (1 + 2) * 3 这种情况
          const { tree, idx } = fatmatTree(list.slice(i + 1), i + 1);
          cacheList.push(tree);
          i = idx;
          continue;
        }
        // 二叉树 没有 满的 情况
        if (current.status === 0) {
          // 1 + (2 + 3)
          const { tree, idx } = fatmatTree(list.slice(i + 1), i + 1);
          const now = findRC(current);
          now.rightChild = tree;
          now.status = 1;
          i = idx;
          current.status = 1;
        } else {
          // 二叉树 满了
          throw new Error('语法树解析失败，0x1');
        }
      } else if (list[i].type === keyWord.RIGHT_PAREN) {
        // 解析到 右括号
        if (!current && !cacheList.length) {
          throw new Error('解析语法树出错, 0x2');
        } else if (current) {
          return {
            tree: current,
            idx: i + parenIdx,
          };
        } else {
          return {
            tree: cacheList[0],
            idx: i + parenIdx,
          };
        }

      }
    }
    if (!current && cacheList.length === 1) {
      current = cacheList[0];
    } else if (!current && (cacheList.length > 1 || cacheList.length === 0)) {
      throw new Error('解析语法树出错, 0x3');
    }
    return current;
  }

  function calc (tree) {
    let leftResult = 0;
    if (tree.leftChild) {
      if (tree.leftChild.type === keyWord.DIGIT) {
        leftResult += Number(tree.leftChild.value);
      } else {
        leftResult = calc(tree.leftChild);
      }
    }
    let rightResult = 0;
    if (tree.rightChild) {
      if (tree.rightChild.type === keyWord.DIGIT) {
        rightResult += Number(tree.rightChild.value);
      } else {
        rightResult = calc(tree.rightChild);
      }
    }
    let result;
    switch (tree.type) {
      case keyWord.ADD_OPERATOR:
        result = leftResult + rightResult;
        break;
      case keyWord.SUB_OPERATOR:
        result = leftResult - rightResult;
        break;
      case keyWord.MUL_OPERATOR:
        result = leftResult * rightResult;
        break;
      case keyWord.DIV_OPERATOR:
        if (rightResult === 0) {
          throw new Error('被除数不允许为0');
        }
        result = leftResult / rightResult;
        break;
      default:
        result = Number(tree.value);
    }
    return result;
  }

  global.calcjs = main;
})(this);
