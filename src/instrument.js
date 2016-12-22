import recast from "recast";
const {builders: b} = recast.types;

import {clearStmt, useStrictStmt, enterStmt, loopStmt, leaveStmt,throwStmt, catchStmt} from "./ast-builders";

const {visit} = recast.types;

export default function instrument(inputCode) {
    let instrumented = recast.print(
        transform(recast.parse(inputCode, {
            sourceFileName: 'input'
        })), {
            sourceMapName: 'map'
        });
    return instrumented;
}

var currentFunction = null;

function transform(ast) {
    visit(ast, {
        visitProgram (path) {
            let node = path.node;
            node.body.unshift(clearStmt())
            node.body.unshift(useStrictStmt());
            this.traverse(path);
        },

        visitFunction: visitEnter,
        visitFunctionDeclaration: visitEnter,
        visitFunctionExpression: visitEnter,

        visitWhileStatement: visitLoop,
        visitDoWhileStatement: visitLoop,
        visitForStatement: visitLoop,
        visitForInStatement: visitLoop,

        visitReturnStatement: visitLeave,
        visitThrowStatement: visitThrow,

        visitCatchClause: visitCatchClause
    });

    return ast;
}

function visitEnter(path) {
    console.error(path);
    let node = path.node;
    let body;
    if (node.body instanceof Array) {
        body = path.get('body');
    } else if (node.body.constructor.name === 'BlockStatement') {
        body = path.get('body', 'body');
    }

    body.unshift(enterStmt(node));
    body.push(b.expressionStatement(leaveStmt()));

    let oldFn = currentFunction;
    currentFunction = node;

    this.traverse(path);

    currentFunction = oldFn;
}

function visitLoop(path) {
    let node = path.node;
    let body;
    if (node.body instanceof Array) {
        body = path.get('body');
    } else if (node.body.constructor.name === 'BlockStatement') {
        body = path.get('body', 'body');
    }

    body.unshift(loopStmt(node));
    this.traverse(path);
}

function visitLeave(path) {
    let node = path.node;
    node.argument = leaveStmt(node.argument);
    return this.traverse(path);
}

function visitThrow(path) {
    let node = path.node;
    node.argument = throwStmt(node.argument);
    return this.traverse(path);
}

function visitCatchClause(path) {
    let node = path.node;

    let body;
    if (node.body instanceof Array) {
        body = path.get('body');
    } else if (node.body.constructor.name === 'BlockStatement') {
        body = path.get('body', 'body');
    }

    body.unshift(catchStmt(node, currentFunction));

    return this.traverse(path);
}