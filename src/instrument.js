import recast from "recast";
const {builders: b} = recast.types;

import {clearStmt, useStrictStmt, enterStmt, loopStmt, leaveStmt} from "./ast-builders";

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
        visitThrowStatement: visitLeave
    });

    return ast;
}

function visitEnter(path) {
    console.error(path);
    let node = path.node;
    let body;
    if (node.body instanceof Array) {
        body = node.body;
    } else if (node.body.constructor.name === 'BlockStatement') {
        body = node.body.body;
    }

    body.unshift(enterStmt(node));
    body.push(b.expressionStatement(leaveStmt()));

    this.traverse(path);
}

function visitLoop(path) {
    let node = path.node;
    if (node.body instanceof Array) {
        node.body.unshift(loopStmt(node));
    } else if (node.body.constructor.name === 'BlockStatement') {
        node.body.body.unshift(loopStmt(node));
    }
    this.traverse(path);
}

function visitLeave(path) {
    let node = path.node;
    node.argument = leaveStmt(node.argument);
    return this.traverse(path);
}
