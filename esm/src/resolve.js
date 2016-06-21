"use strict";
require('rxjs/add/operator/map');
require('rxjs/add/operator/toPromise');
const forkJoin_1 = require('rxjs/observable/forkJoin');
const fromPromise_1 = require('rxjs/observable/fromPromise');
function resolve(resolver, state) {
    return resolveNode(resolver, state._root).map(_ => state);
}
exports.resolve = resolve;
function resolveNode(resolver, node) {
    if (node.children.length === 0) {
        return fromPromise_1.fromPromise(resolveComponent(resolver, node.value).then(factory => {
            node.value._resolvedComponentFactory = factory;
            return node.value;
        }));
    }
    else {
        const c = node.children.map(c => resolveNode(resolver, c).toPromise());
        return forkJoin_1.forkJoin(c).map(_ => resolveComponent(resolver, node.value).then(factory => {
            node.value._resolvedComponentFactory = factory;
            return node.value;
        }));
    }
}
function resolveComponent(resolver, snapshot) {
    if (snapshot.component && snapshot._routeConfig) {
        return resolver.resolveComponent(snapshot.component);
    }
    else {
        return Promise.resolve(null);
    }
}
//# sourceMappingURL=resolve.js.map