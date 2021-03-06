import recast from "recast";

const {builders: b} = recast.types;

export function clearStmt() {
    // CLEAR();
    return b.expressionStatement(b.callExpression(
        b.identifier('CLEAR'),
        []
    ));
}

export function useStrictStmt() {
    // 'use strict';
    return b.expressionStatement(literal('use strict'));
}

export function enterStmt(fnDecl) {
    let loc = literal(fnDecl.loc);
    let name = (fnDecl.id && fnDecl.id.name) || 'anonymous';
    // ENTER('name', name, loc)
    return b.expressionStatement(b.callExpression(
        b.identifier('ENTER'),
        [
            b.literal(name),
            name === 'anonymous' ? literal(null) : b.identifier(name),
            b.identifier('arguments'),
            b.identifier('this'),
            loc
        ]
    ));
}

export function loopStmt(node) {
    let loc = literal(node.loc);
    // LOOP(loc)
    return b.expressionStatement(b.callExpression(
        b.identifier('LOOP'),
        [loc]
    ));
}

export function leaveStmt(node) {
    node = node || literal(undefined);
    let loc = node != null ? literal(node.loc) : null;
    // LEAVE(node, loc)
    return b.callExpression(
        b.identifier('LEAVE'),
        [
            node,
            loc
        ]
    );
}

export function throwStmt(node) {
    node = node || literal(undefined);
    let loc = node != null ? literal(node.loc) : null;
    // THROW(node, loc)
    return b.callExpression(
        b.identifier('THROW'),
        [
            node,
            loc
        ]
    );
}

export function catchStmt(node, fnNode) {
    let param = node.param;
    let nodeLoc = node != null ? literal(node.loc) : null;
    let fnLoc = fnNode != null ? literal(fnNode.loc) : null;
    // CATCH(nodeLoc, fnLoc)
    return b.expressionStatement(b.callExpression(
        b.identifier('CATCH'),
        [
            node.param,
            nodeLoc,
            fnLoc
        ]
    ));
}

export function literal(item) {
    let ans;
    switch (typeof item) {
        case 'undefined':
            ans = b.identifier('undefined');
            break;
        case 'object':
            if (item === null) {
                ans = b.literal(item);
            } else {
                ans = objectLiteral(item);
            }
            break;
        case 'boolean':
        case 'number':
        case 'string':
            ans = b.literal(item)
            break;
        default:
            throw new Error(`can't make ast for literal`)
    }
    return ans;
}

function objectLiteral(object) {
    let properties = Object.keys(object)
        .map(key =>  b.property(
                'init',
                b.identifier(key),
                literal(object[key])
        ));
    
    return b.objectExpression(properties);
}