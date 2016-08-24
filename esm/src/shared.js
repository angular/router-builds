/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Name of the primary outlet.
 * @type {string}
 *
 * @stable
 */
export const PRIMARY_OUTLET = 'primary';
export class NavigationCancelingError extends Error {
    constructor(message) {
        super(message);
        this.message = message;
        this.stack = (new Error(message)).stack;
    }
    toString() { return this.message; }
}
//# sourceMappingURL=shared.js.map