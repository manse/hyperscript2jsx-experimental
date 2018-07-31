'use strict';
import * as prettier from 'prettier';
import * as ts from 'typescript';
import * as vscode from 'vscode';

const print = (() => {
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed
  });
  const resultFile = ts.createSourceFile(
    '/tmp/hyperscript2jsx-chunk.ts',
    '',
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS
  );
  return (node: any) => printer.printNode(ts.EmitHint.Unspecified, node, resultFile);
})();

function process(node: any, option: { inBrackets?: boolean; reactChild?: boolean } = {}): string {
  switch (node.kind) {
    case ts.SyntaxKind.CallExpression:
      let tagName = node.expression.escapedText;
      let selectorArg: any;
      let propsArg: any;
      let childrenArgs: any[];
      if (node.arguments[0]) {
        if (
          node.arguments[0].kind === ts.SyntaxKind.StringKeyword ||
          node.arguments[0].kind === ts.SyntaxKind.StringLiteral ||
          node.arguments[0].kind === ts.SyntaxKind.TemplateExpression ||
          node.arguments[0].kind === ts.SyntaxKind.BinaryExpression ||
          node.arguments[0].kind === ts.SyntaxKind.ExpressionStatement ||
          node.arguments[0].kind === ts.SyntaxKind.PropertyAccessExpression ||
          node.arguments[0].kind === ts.SyntaxKind.ConditionalExpression
        ) {
          selectorArg = node.arguments.shift();
        }
        if (node.arguments[0] && node.arguments[0].kind === ts.SyntaxKind.ObjectLiteralExpression) {
          propsArg = node.arguments.shift();
        }
      }
      childrenArgs = node.arguments;

      const props: any = {};
      if (selectorArg) {
        props.className = selectorArg;
      }
      if (propsArg) {
        propsArg.properties.forEach((prop: any) => {
          props[prop.name.escapedText] = prop.initializer;
        });
      }
      if (tagName === 'h' && props.className) {
        const classNameString = print(props.className);
        const matched = classNameString.match(/^["'`](\w+)/);
        if (matched) {
          tagName = matched[1];
          const value = classNameString.replace(/^(["'`])\w+/, '$1');
          if (props.className.kind === ts.SyntaxKind.StringLiteral) {
            props.className = value;
          } else {
            props.className = `{${value}}`;
          }
        }
      }
      if (!tagName) {
        return `{${print(node)}}`;
      }
      const propsString = Object.keys(props)
        .map(p => {
          const value = (props as any)[p];
          if (typeof value === 'object') {
            const printed = print(value);
            if (value.kind === ts.SyntaxKind.StringLiteral) {
              return `${p}=${printed}`;
            } else {
              return `${p}={${printed}}`;
            }
          } else {
            return `${p}=${value}`;
          }
        })
        .join(' ');
      const children = childrenArgs.map(child => process(child, { reactChild: true })).join('\n');
      return `<${tagName} ${propsString}>${children}</${tagName}>`;
    case ts.SyntaxKind.ArrayLiteralExpression:
      return (node.elements.map((elem: any) => process(elem, option)) || []).join('\n');
    case ts.SyntaxKind.StringLiteral:
      if (option.reactChild) {
        return JSON.parse(print(node));
      } else {
        return print(node);
      }
    case ts.SyntaxKind.TemplateExpression:
    case ts.SyntaxKind.PropertyAccessExpression:
    case ts.SyntaxKind.NullKeyword:
    case ts.SyntaxKind.BooleanKeyword:
    case ts.SyntaxKind.UndefinedKeyword:
    case ts.SyntaxKind.ObjectKeyword:
    case ts.SyntaxKind.StringKeyword:
    case ts.SyntaxKind.TrueKeyword:
    case ts.SyntaxKind.FalseKeyword:
      if (option.inBrackets) {
        return print(node);
      } else {
        return `{${print(node)}}`;
      }
    case ts.SyntaxKind.BinaryExpression:
      return `{${process(node.left, { inBrackets: true })} /* ${print(node.operatorToken)} */ ${process(node.right, {
        inBrackets: true
      })}}`;
    case ts.SyntaxKind.ConditionalExpression:
      return `{${print(node.condition)} ? (${process(node.whenTrue, { inBrackets: true })}) : (${process(
        node.whenFalse,
        { inBrackets: true }
      )})}`;
    case ts.SyntaxKind.ExpressionStatement:
    case ts.SyntaxKind.ReturnStatement:
      return process(node.expression);
    default:
      if (node.escapedText) {
        if (option.inBrackets) {
          return node.escapedText;
        } else {
          return `{${node.escapedText}}`;
        }
      }
      return '';
  }
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('extension.hyperscript2jsx', () => {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const selection = editor.selection.isEmpty
        ? new vscode.Range(
            editor.document.positionAt(0),
            editor.document.positionAt(editor.document.getText().length - 1)
          )
        : editor.selection;
      const hyperscript = editor.document.getText(selection);
      const source = ts.createSourceFile('./chunk.ts', hyperscript, ts.ScriptTarget.ES2015);
      const chunks: string[] = [];
      ts.forEachChild(source, (node: ts.Node) => {
        // console.log(node);
        chunks.push(process(node));
      });
      let resultJsx = chunks.join('\n');
      try {
        resultJsx = prettier.format(resultJsx, {
          parser: 'typescript'
        });
      } catch (e) {
        console.error(e);
      }
      resultJsx = resultJsx.replace(/^;/, '').replace(/(\\u\w+)/g, (_, m) => JSON.parse(`"${m}"`));
      editor.edit(edit => {
        edit.replace(selection, resultJsx);
      });
    } catch (e) {
      vscode.window.showErrorMessage(e.message);
    }
  });
  context.subscriptions.push(disposable);
}

export function deactivate() {}
