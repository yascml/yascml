import { AssignmentExpression, Expression, FunctionDeclaration, Node, ObjectExpression, parse, Property, Statement, VariableDeclarator } from 'acorn';
import { simple } from 'acorn-walk';
import { BlockStatement, CallExpression, ExpressionStatement, Identifier, Literal, Program } from 'acorn';

type ParentNodeType = Expression | Statement | Property | VariableDeclarator | AssignmentExpression;

export const parseScript = (script: string) => (
  parse(script, {
    ecmaVersion: 'latest',
    sourceType: 'script',
  })
);

export const getRealScriptAST = (root: Program) => {
  if (root.body.length === 0)
    throw new Error('Failed to find real script');

  const initTest = root.body[0];
  if (initTest.type !== 'IfStatement')
    throw new Error('Failed to find real script');

  if (
    initTest.test.type !== 'BinaryExpression' ||
    initTest.test.operator !== '===' ||
    (initTest.test.right.type !== 'Literal' || initTest.test.right.value !== 'loading')
  ) throw new Error('Invalid init test stamement');

  // The engine IIFE may not be the first statement of the guard block:
  // e.g. unminified builds prepend `window.TWINE1` / `window.DEBUG` assignments
  // (as in the Degrees of Lewdity SugarCube fork), so search the whole block.
  const guardBody = (initTest.consequent as BlockStatement).body;
  let engineCode: CallExpression | null = null;

  for (const stmt of guardBody) {
    simple(stmt, {
      CallExpression(e) {
        if (engineCode) return;

        // The engine is wrapped in an IIFE invoked as `(function (window, document, jQuery, undefined) { ... })(window, window.document, jQuery)`,
        // which may be prefixed by a unary operator (e.g. `!function (...) { ... }(...)`).
        if (e.arguments.length < 3) return;
        if ((e.arguments[0] as Identifier).name !== 'window') return;
        if (e.arguments[1].type !== 'MemberExpression') return;
        if ((e.arguments[2] as Identifier).name !== 'jQuery') return;
        if (e.callee.type !== 'FunctionExpression') return;
        if (e.callee.params.length < 3) return;

        engineCode = e;
      },
    });
    if (engineCode) break;
  }
  if (!engineCode)
    throw new Error('Cannot find engine code');

  return {
    type: 'ExpressionStatement',
    expression: engineCode,
    start: -1,
    end: -1
  } as ExpressionStatement;
};

export const findObjCreateNull = (e: CallExpression) => (
  e.arguments.length === 2 &&
  e.callee.type === 'MemberExpression' &&
  (e.callee.object as Identifier).name === 'Object' &&
  (e.callee.property as Identifier).name === 'create' &&
  (e.arguments[0] as Literal).value === null &&
  e.arguments[1].type === 'ObjectExpression'
);

export const findObjDefineProperties = (e: CallExpression) => (
  e.arguments.length === 2 &&
  e.callee.type === 'MemberExpression' &&
  (e.callee.object as Identifier).name === 'Object' &&
  (e.callee.property as Identifier).name === 'defineProperties' &&
  e.arguments[0].type === 'ObjectExpression' &&
  e.arguments[1].type === 'ObjectExpression'
);

export const findObjPreventExtensions = (e: CallExpression) => (
  e.arguments.length !== 0 &&
  e.callee.type === 'MemberExpression' &&
  (e.callee.object as Identifier).name === 'Object' &&
  (e.callee.property as Identifier).name === 'preventExtensions'
);

export const findObjFreeze = (e: CallExpression) => (
  e.arguments.length !== 0 &&
  e.callee.type === 'MemberExpression' &&
  (e.callee.object as Identifier).name === 'Object' &&
  (e.callee.property as Identifier).name === 'freeze'
);

export const findObjSeal = (e: CallExpression) => (
  e.arguments.length !== 0 &&
  e.callee.type === 'MemberExpression' &&
  (e.callee.object as Identifier).name === 'Object' &&
  (e.callee.property as Identifier).name === 'seal'
);

export const findSCDefine = (e: CallExpression) => (
  e.arguments.length === 3 &&
  e.callee.type === 'MemberExpression' &&
  (e.callee.object as Identifier).name === 'Object' &&
  (e.callee.property as Identifier).name === 'defineProperty' &&
  (e.arguments[0] as Identifier).name === 'window' &&
  (e.arguments[1] as Literal).value === 'SugarCube'
);

export const findSCAssign = (e: AssignmentExpression) => (
  e.operator === '=' &&
  e.left.type === 'MemberExpression' &&
  (e.left.object as Identifier).name === 'window' &&
  (e.left.property as Identifier).name === 'SugarCube'
);

export const findPromiseCatch = (e: CallExpression) => (
  e.arguments.length === 1 &&
  e.callee.type === 'MemberExpression' &&
  e.callee.property.type === 'Identifier' &&
  e.callee.property.name === 'catch' &&
  (e.arguments[0].type === 'FunctionExpression' || e.arguments[0].type === 'ArrowFunctionExpression')
);

export const findInitExpression = (e: CallExpression) => (
  e.arguments.length === 1 &&
  e.callee.type === 'Identifier' &&
  e.callee.name === 'jQuery' &&
  (e.arguments[0].type === 'FunctionExpression' || e.arguments[0].type === 'ArrowFunctionExpression') &&
  e.arguments[0].params.length === 0
);

const createObjProps = (key: string, value: any): Property => {
  const _key: Identifier = {
    type: 'Identifier',
    name: key,
    start: -1,
    end: -1
  };

  const _value: Literal = {
    type: 'Literal',
    value,
    start: -1,
    end: -1
  };

  return {
    type: 'Property',
    key: _key,
    value: _value,
    kind: 'init',
    method: false,
    shorthand: false,
    computed: false,
    start: -1,
    end: -1
  };
};

export const modifyObjProps = (ast: ObjectExpression) => {
  for (const prop of ast.properties as Property[]) {
    if (prop.value.type !== 'ObjectExpression') continue;

    const props = prop.value.properties as Property[];
    const propsName = props.map((e) => e.key.type === 'Identifier' ? e.key.name : null).filter(e => e !== null);

    if (!propsName.includes('get') && !propsName.includes('set')) {
      props.push(createObjProps('writable', true));
    }

    props.push(createObjProps('configurable', true));
    props.push(createObjProps('enumerable', true));
  }
};

export const replaceFromParentNode = (parent: Node, old: Expression, replaces: Expression) => {
  const _p = parent as ParentNodeType;

  switch (_p.type) {
    case 'SequenceExpression': {
      const index = _p.expressions.findIndex(e => e === old);
      _p.expressions[index] = replaces;
      break;
    }

    case 'CallExpression': {
      const index = _p.arguments.findIndex(e => e === old);
      _p.arguments[index] = replaces;
      break;
    }

    case 'ReturnStatement': {
      _p.argument = replaces;
      break;
    }

    case 'Property': {
      _p.value = replaces;
      break;
    }

    case 'VariableDeclarator': {
      _p.init = replaces;
      break;
    }

    case 'AssignmentExpression': {
      _p.right = replaces;
      break;
    }

    default: {
      console.warn(`Unknown parent type found: ${_p.type}, skipping...`);
    }
  }
};

export const createFunction = (name: string, body: Statement[] = []): FunctionDeclaration => ({
  type: 'FunctionDeclaration',
  id: {
    type: 'Identifier',
    name,
    start: -1,
    end: -1,
  },
  body: {
    type: 'BlockStatement',
    body,
    start: -1,
    end: -1
  },
  params: [],
  generator: false,
  expression: false,
  async: false,
  start: -1,
  end: -1,
});
