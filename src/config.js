"use strict";
function validateConfig(config) {
    config.forEach(validateNode);
}
exports.validateConfig = validateConfig;
function validateNode(route) {
    if (!!route.redirectTo && !!route.children) {
        throw new Error("Invalid configuration of route '" + route.path + "': redirectTo and children cannot be used together");
    }
    if (!!route.redirectTo && !!route.component) {
        throw new Error("Invalid configuration of route '" + route.path + "': redirectTo and component cannot be used together");
    }
    if (route.redirectTo === undefined && !route.component && !route.children) {
        throw new Error("Invalid configuration of route '" + route.path + "': component, redirectTo, children must be provided");
    }
    if (route.path === undefined) {
        throw new Error("Invalid route configuration: routes must have path specified");
    }
    if (route.path.startsWith('/')) {
        throw new Error("Invalid route configuration of route '" + route.path + "': path cannot start with a slash");
    }
}
//# sourceMappingURL=config.js.map