import { ancestor } from 'acorn-walk';
import { generate } from 'astring';
import {
  parseScript,
  getRealScriptAST,
  modifyObjProps,
  findObjCreateNull,
  findObjDefineProperties,
  findObjPreventExtensions,
  findObjFreeze,
  findObjSeal,
  findPromiseCatch,
  findSCDefine,
  findSCAssign,
  replaceFromParentNode,
  findInitExpression,
  createFunction,
} from './utils';
import {
  ArrowFunctionExpression,
  BlockStatement,
  CallExpression,
  Expression,
  ExpressionStatement,
  FunctionDeclaration,
  FunctionExpression,
  MemberExpression,
  NewExpression,
  Node,
  ObjectExpression,
  ReturnStatement,
  SequenceExpression,
  Statement,
  VariableDeclarator, 
} from 'acorn';
import { Options } from 'astring';

const DefaultGenerateOptions: Options = {
  indent: '',
  lineEnd: '',
};

const buildCustomInitFunction = (name: string, code: string) => (
`function ${name}() {
${code}
}`);

const buildSugarCubeExposeScript = (customExpose?: string[], customInit?: string[]) => ( /*javascript*/`
Object.defineProperty(window, '$SugarCube', {
  value: Object.freeze({
    LoadScreen,
    Alert,
    $init: {
      initEngine,
      ${customInit ? customInit.filter(e => e !== 'initEngine').join(',')  : ''}
    },
    ${customExpose ? customExpose.join(',')  : ''}
  }),
})`);

/**
 * Remove the statement that directly contains `node` from its enclosing block.
 * Returns the removed statement, or `null` if none was found.
 */
const removeWrappingStatement = (_node: Node, ancestors: Node[]): Statement | null => {
  for (let i = ancestors.length - 1; i >= 1; i--) {
    const current = ancestors[i];
    const parent = ancestors[i - 1];
    if (parent.type === 'BlockStatement') {
      const body = (parent as BlockStatement).body;
      const index = body.findIndex(e => e === current);
      if (index !== -1) {
        body.splice(index, 1);
        return current as Statement;
      }
    }
  }
  return null;
};

/**
 * Check whether `chain` is a promise chain rooted at `new Promise(...)`,
 * i.e. `new Promise(...).then(...).catch(...)` / `.finally(...)`.
 */
const isPromiseChainRoot = (chain: CallExpression): boolean => {
  let root: Expression = chain;
  while (root.type === 'CallExpression') {
    const call = root as CallExpression;
    if (call.callee.type !== 'MemberExpression') break;
    const member = call.callee as MemberExpression;
    if (member.property.type !== 'Identifier') break;
    if (!['then', 'catch', 'finally'].includes(member.property.name)) break;
    root = member.object as Expression;
  }
  if (root.type !== 'NewExpression') return false;
  const callee = (root as NewExpression).callee;
  return callee.type === 'Identifier' && callee.name === 'Promise';
};

/**
 * Patch the original SugarCube script, expose some internal variables and the initial function.
 * All exports will be defined at `window.$SugarCube`.
 * 
 * @param {string} script - The original engine script
 * @param {string[]} [customExpose] - Custom exports to `window.$SugarCube`, exporting undefined name will throw an error
 * @param {Record<string, string>} [customInit] - Custom initial functions, this will be exposed to `window.$SugarCube.$init`
 * @param {Options} [generateOptions] - Generate options for [astring](https://github.com/davidbonnet/astring#generatenode-object-options-object-string--object)
 * @returns {string} Patched engine script.
 */
export const patchEngineScript = (
  script: string,
  customExpose?: string[],
  customInit?: { [name: string]: string },
  generateOptions: Options = {}
) => {
  const pushToASTBody = (ast: ExpressionStatement, ...statements: Statement[]) => (
    (
      (
        (ast.expression as CallExpression).callee as FunctionExpression
      ).body as BlockStatement
    ).body.push(...statements)
  );

  const ast = parseScript(script);
  const realAST = getRealScriptAST(ast);
  let initFuncAST: FunctionExpression | ArrowFunctionExpression | null = null;

  ancestor(realAST, {
    CallExpression: (node, _, ancestors) => {
      // Parse `Object.create(null, {...})`, make objects writable and configurable
      if (findObjCreateNull(node)) {
        modifyObjProps(node.arguments[1] as ObjectExpression);
        node.arguments[0] = {
          type: 'ObjectExpression',
          properties: [],
          start: -1,
          end: -1,
        };
      }

      // Parse `Object.defineProperties({}, {...})`, make objects writable and configurable
      if (findObjDefineProperties(node)) {
        modifyObjProps(node.arguments[1] as ObjectExpression);
      }
      
      // Replace `Object.preventExtensions({...})`
      if (findObjPreventExtensions(node)) {
        const arg = node.arguments[0] as Expression;
        const parent = ancestors[ancestors.length - 2];
        replaceFromParentNode(parent, node, arg);
      }

      // Replace `Object.freeze({...})`
      if (findObjFreeze(node)) {
        const arg = node.arguments[0] as Expression;
        const parent = ancestors[ancestors.length - 2];
        replaceFromParentNode(parent, node, arg);
      }

      // Replace `Object.seal({...})`
      if (findObjSeal(node)) {
        const arg = node.arguments[0] as Expression;
        const parent = ancestors[ancestors.length - 2];
        replaceFromParentNode(parent, node, arg);
      }

      // Find & remove init function
      if (findInitExpression(node)) {
        const result = node.arguments[0] as FunctionExpression | ArrowFunctionExpression;
        initFuncAST = result;

        const parent = ancestors[ancestors.length - 2];
        if ((parent as SequenceExpression).type === 'SequenceExpression') {
          const index = (parent as SequenceExpression).expressions.findIndex(e => e === node);
          (parent as SequenceExpression).expressions.splice(index, 1);
        } else if (parent.type === 'ExpressionStatement') {
          const block = ancestors[ancestors.length - 3] as BlockStatement;
          const index = block.body.findIndex(e => e === parent);
          if (index !== -1) block.body.splice(index, 1);
        } else {
          throw new Error(`Cannot remove init function, unexpected parent type: ${parent.type}`);
        }
      }
    },
  });

  if (!initFuncAST)
    throw new Error('Cannot find engine init function');

  // Note: TS's CFA narrows `initFuncAST` to `never` here because it is assigned inside a
  // closure (the ancestor walk), so we cast explicitly to recover the non-null type.
  const initFunc = initFuncAST as FunctionExpression | ArrowFunctionExpression;
  const initFuncBody = initFunc.body as BlockStatement;

  // Finds the real init code
  let initCodeAST: CallExpression | BlockStatement | null = null;

  // Prefer the outermost promise chain: `new Promise(...).then(...).catch(...)`.
  // Multiple `.catch()` calls may exist (e.g. nested in helpers), so pick the one
  // closest to the init function root (shortest ancestor path) that chains to `new Promise`.
  {
    let bestDepth = Infinity;
    ancestor(initFunc, {
      CallExpression: (node, _, ancestors) => {
        if (!findPromiseCatch(node)) return;
        const chain = (node.callee as MemberExpression).object as CallExpression;
        if (!isPromiseChainRoot(chain)) return;
        if (ancestors.length < bestDepth) {
          bestDepth = ancestors.length;
          initCodeAST = chain;
        }
      },
    });
  }

  if (!initCodeAST) { // try {} catch {}
    ancestor(initFunc, {
      TryStatement: (node, _, ancestors) => {
        // Only the top-level try/catch directly in the init function body.
        const parent = ancestors[ancestors.length - 2];
        if (parent !== initFuncBody) return;
        initCodeAST = node.block;
      },
    });
  }

  if (!initCodeAST)
    throw new Error('Cannot find engine init code (expected a top-level promise chain or try/catch in the init function)');

  { // Parse init code, remove `LoadScreen` calls
    const isPromise = (initCodeAST as Statement).type !== 'BlockStatement';
    let resolveInjected = false;
    ancestor(initCodeAST, {
      CallExpression: (node, _, ancestors) => {
        if (
          node.callee.type !== 'MemberExpression' ||
          node.callee.object.type !== 'Identifier' ||
          node.callee.object.name !== 'LoadScreen'
        ) return;

        const parent = ancestors[ancestors.length - 2] as Expression | VariableDeclarator | ReturnStatement;
        if (parent.type === 'ArrowFunctionExpression' && !resolveInjected) {
          // Replace `LoadScreen.unlock()` with `resolve()`
          // in `setTimeout(() => LoadScreen.unlock())`
          parent.body = {
            type: 'CallExpression',
            callee: {
              type: 'Identifier',
              name: 'resolve',
              start: -1,
              end: -1,
            },
            arguments: [],
            optional: false,
            start: -1,
            end: -1,
          };
          resolveInjected = true;
        } else if (parent.type === 'ReturnStatement') {
          if (!resolveInjected && !isPromise) {
            // Replace `LoadScreen.unlock()` with `resolve()`
            // in `setTimeout(function () { return LoadScreen.unlock() })`
            parent.argument = {
              type: 'CallExpression',
              callee: {
                type: 'Identifier',
                name: 'resolve',
                start: -1,
                end: -1,
              },
              arguments: [],
              optional: false,
              start: -1,
              end: -1,
            };
            resolveInjected = true;
          } else {
            parent.argument = null;
          }
        } else if (parent.type === 'VariableDeclarator') {
          parent.init = {
            type: 'Literal',
            value: null,
            start: -1,
            end: -1,
          };
        } else if (parent.type === 'SequenceExpression') {
          const index = parent.expressions.findIndex(e => e === node);
          parent.expressions.splice(index, 1);
        }
      },
    });
  }

  // If we found the `SugarCube` export inside the init code
  // (`Object.defineProperty(window, 'SugarCube', {...})` or `window.SugarCube = {...}`),
  // extract it to the top level so it is populated synchronously, before `initEngine` runs.
  // Without this, e.g. on SugarCube 2.31.x, `window.SugarCube` stays an empty placeholder
  // until the async init executes, breaking the loader.
  const extractedStatements: Statement[] = [];
  ancestor(initCodeAST, {
    CallExpression: (node, _, ancestors) => {
      if (!findSCDefine(node)) return;
      const statement = removeWrappingStatement(node, ancestors);
      if (statement) extractedStatements.push(statement);
    },
    AssignmentExpression: (node, _, ancestors) => {
      if (!findSCAssign(node)) return;
      const statement = removeWrappingStatement(node, ancestors);
      if (statement) extractedStatements.push(statement);
    },
  });
  if (extractedStatements.length > 0) pushToASTBody(realAST, ...extractedStatements);

  // Generate new init function
  let initFuncFinal: FunctionDeclaration | null = null;
  if ((initCodeAST as CallExpression).type === 'CallExpression') { // new Promise().then()
    initFuncFinal = createFunction('initEngine', [{
      type: 'ReturnStatement',
      argument: initCodeAST,
      start: -1,
      end: -1,
    }]);
  } else if ((initCodeAST as BlockStatement).type === 'BlockStatement') { // try {} catch {}
    initFuncFinal = createFunction('initEngine', [{
      type: 'ReturnStatement',
      argument: {
        type: 'NewExpression',
        callee: {
          type: 'Identifier',
          name: 'Promise',
          start: -1,
          end: -1,
        },
        arguments: [{
          type: 'ArrowFunctionExpression',
          params: [{
            type: 'Identifier',
            name: 'resolve',
            start: -1,
            end: -1,
          }],
          body: initCodeAST,
          expression: false,
          generator: false,
          async: false,
          start: -1,
          end: -1,
        }],
        start: -1,
        end: -1,
      },
      start: -1,
      end: -1,
    }]);
  }

  // If custom `initEngine` found, we will skip this and use the custom one.
  if (
    initFuncFinal &&
    (!customInit || Object.keys(customInit).findIndex(e => e === 'initEngine') === -1)
  )
    pushToASTBody(realAST, initFuncFinal);

  // Build custom init function & exports
  let customScriptStr = '';
  if (customInit) {
    for (const name in customInit) {
      customScriptStr += buildCustomInitFunction(name, customInit[name]);
    }
  }
  customScriptStr += buildSugarCubeExposeScript(customExpose, Object.keys(customInit ?? {}));
  pushToASTBody(realAST, ...parseScript(customScriptStr).body as (Statement | FunctionDeclaration)[]);

  // finish patching
  return generate(realAST, {
    ...DefaultGenerateOptions,
    ...generateOptions
  });
};
