/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { InjectionToken } from '@angular/core';
/**
 * A [DI token](guide/glossary/#di-token) for the router service.
 *
 * @publicApi
 */
export const ROUTER_CONFIGURATION = new InjectionToken((typeof ngDevMode === 'undefined' || ngDevMode) ? 'router config' : '', {
    providedIn: 'root',
    factory: () => ({}),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2NvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX2NvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBNFA3Qzs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxjQUFjLENBQ2xELENBQUMsT0FBTyxTQUFTLEtBQUssV0FBVyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtJQUN0RSxVQUFVLEVBQUUsTUFBTTtJQUNsQixPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7Q0FDcEIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7SW5qZWN0aW9uVG9rZW59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQge09uU2FtZVVybE5hdmlnYXRpb259IGZyb20gJy4vbW9kZWxzJztcblxuXG4vKipcbiAqIEVycm9yIGhhbmRsZXIgdGhhdCBpcyBpbnZva2VkIHdoZW4gYSBuYXZpZ2F0aW9uIGVycm9yIG9jY3Vycy5cbiAqXG4gKiBJZiB0aGUgaGFuZGxlciByZXR1cm5zIGEgdmFsdWUsIHRoZSBuYXZpZ2F0aW9uIFByb21pc2UgaXMgcmVzb2x2ZWQgd2l0aCB0aGlzIHZhbHVlLlxuICogSWYgdGhlIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbiwgdGhlIG5hdmlnYXRpb24gUHJvbWlzZSBpcyByZWplY3RlZCB3aXRoXG4gKiB0aGUgZXhjZXB0aW9uLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqIEBkZXByZWNhdGVkIFN1YnNjcmliZSB0byB0aGUgYFJvdXRlcmAgZXZlbnRzIGFuZCB3YXRjaCBmb3IgYE5hdmlnYXRpb25FcnJvcmAgaW5zdGVhZC5cbiAqICAgSWYgdGhlIEVycm9ySGFuZGxlciBpcyB1c2VkIHRvIHByZXZlbnQgdW5oYW5kbGVkIHByb21pc2UgcmVqZWN0aW9ucyB3aGVuIG5hdmlnYXRpb25cbiAqICAgZXJyb3JzIG9jY3VyLCB1c2UgdGhlIGByZXNvbHZlTmF2aWdhdGlvblByb21pc2VPbkVycm9yYCBvcHRpb24gaW5zdGVhZC5cbiAqXG4gKiBAc2VlIFJvdXRlckNvbmZpZ09wdGlvbnNcbiAqL1xuZXhwb3J0IHR5cGUgRXJyb3JIYW5kbGVyID0gKGVycm9yOiBhbnkpID0+IGFueTtcblxuLyoqXG4gKiBBbGxvd2VkIHZhbHVlcyBpbiBhbiBgRXh0cmFPcHRpb25zYCBvYmplY3QgdGhhdCBjb25maWd1cmVcbiAqIHdoZW4gdGhlIHJvdXRlciBwZXJmb3JtcyB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIG9wZXJhdGlvbi5cbiAqXG4gKiAqICdlbmFibGVkTm9uQmxvY2tpbmcnIC0gKGRlZmF1bHQpIFRoZSBpbml0aWFsIG5hdmlnYXRpb24gc3RhcnRzIGFmdGVyIHRoZVxuICogcm9vdCBjb21wb25lbnQgaGFzIGJlZW4gY3JlYXRlZC4gVGhlIGJvb3RzdHJhcCBpcyBub3QgYmxvY2tlZCBvbiB0aGUgY29tcGxldGlvbiBvZiB0aGUgaW5pdGlhbFxuICogbmF2aWdhdGlvbi5cbiAqICogJ2VuYWJsZWRCbG9ja2luZycgLSBUaGUgaW5pdGlhbCBuYXZpZ2F0aW9uIHN0YXJ0cyBiZWZvcmUgdGhlIHJvb3QgY29tcG9uZW50IGlzIGNyZWF0ZWQuXG4gKiBUaGUgYm9vdHN0cmFwIGlzIGJsb2NrZWQgdW50aWwgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBpcyBjb21wbGV0ZS4gVGhpcyB2YWx1ZSBpcyByZXF1aXJlZFxuICogZm9yIFtzZXJ2ZXItc2lkZSByZW5kZXJpbmddKGd1aWRlL3NzcikgdG8gd29yay5cbiAqICogJ2Rpc2FibGVkJyAtIFRoZSBpbml0aWFsIG5hdmlnYXRpb24gaXMgbm90IHBlcmZvcm1lZC4gVGhlIGxvY2F0aW9uIGxpc3RlbmVyIGlzIHNldCB1cCBiZWZvcmVcbiAqIHRoZSByb290IGNvbXBvbmVudCBnZXRzIGNyZWF0ZWQuIFVzZSBpZiB0aGVyZSBpcyBhIHJlYXNvbiB0byBoYXZlXG4gKiBtb3JlIGNvbnRyb2wgb3ZlciB3aGVuIHRoZSByb3V0ZXIgc3RhcnRzIGl0cyBpbml0aWFsIG5hdmlnYXRpb24gZHVlIHRvIHNvbWUgY29tcGxleFxuICogaW5pdGlhbGl6YXRpb24gbG9naWMuXG4gKlxuICogQHNlZSB7QGxpbmsgZm9yUm9vdCgpfVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgSW5pdGlhbE5hdmlnYXRpb24gPSAnZGlzYWJsZWQnfCdlbmFibGVkQmxvY2tpbmcnfCdlbmFibGVkTm9uQmxvY2tpbmcnO1xuXG4vKipcbiAqIEV4dHJhIGNvbmZpZ3VyYXRpb24gb3B0aW9ucyB0aGF0IGNhbiBiZSB1c2VkIHdpdGggdGhlIGB3aXRoUm91dGVyQ29uZmlnYCBmdW5jdGlvbi5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUm91dGVyQ29uZmlnT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBDb25maWd1cmVzIGhvdyB0aGUgUm91dGVyIGF0dGVtcHRzIHRvIHJlc3RvcmUgc3RhdGUgd2hlbiBhIG5hdmlnYXRpb24gaXMgY2FuY2VsbGVkLlxuICAgKlxuICAgKiAncmVwbGFjZScgLSBBbHdheXMgdXNlcyBgbG9jYXRpb24ucmVwbGFjZVN0YXRlYCB0byBzZXQgdGhlIGJyb3dzZXIgc3RhdGUgdG8gdGhlIHN0YXRlIG9mIHRoZVxuICAgKiByb3V0ZXIgYmVmb3JlIHRoZSBuYXZpZ2F0aW9uIHN0YXJ0ZWQuIFRoaXMgbWVhbnMgdGhhdCBpZiB0aGUgVVJMIG9mIHRoZSBicm93c2VyIGlzIHVwZGF0ZWRcbiAgICogX2JlZm9yZV8gdGhlIG5hdmlnYXRpb24gaXMgY2FuY2VsZWQsIHRoZSBSb3V0ZXIgd2lsbCBzaW1wbHkgcmVwbGFjZSB0aGUgaXRlbSBpbiBoaXN0b3J5IHJhdGhlclxuICAgKiB0aGFuIHRyeWluZyB0byByZXN0b3JlIHRvIHRoZSBwcmV2aW91cyBsb2NhdGlvbiBpbiB0aGUgc2Vzc2lvbiBoaXN0b3J5LiBUaGlzIGhhcHBlbnMgbW9zdFxuICAgKiBmcmVxdWVudGx5IHdpdGggYHVybFVwZGF0ZVN0cmF0ZWd5OiAnZWFnZXInYCBhbmQgbmF2aWdhdGlvbnMgd2l0aCB0aGUgYnJvd3NlciBiYWNrL2ZvcndhcmRcbiAgICogYnV0dG9ucy5cbiAgICpcbiAgICogJ2NvbXB1dGVkJyAtIFdpbGwgYXR0ZW1wdCB0byByZXR1cm4gdG8gdGhlIHNhbWUgaW5kZXggaW4gdGhlIHNlc3Npb24gaGlzdG9yeSB0aGF0IGNvcnJlc3BvbmRzXG4gICAqIHRvIHRoZSBBbmd1bGFyIHJvdXRlIHdoZW4gdGhlIG5hdmlnYXRpb24gZ2V0cyBjYW5jZWxsZWQuIEZvciBleGFtcGxlLCBpZiB0aGUgYnJvd3NlciBiYWNrXG4gICAqIGJ1dHRvbiBpcyBjbGlja2VkIGFuZCB0aGUgbmF2aWdhdGlvbiBpcyBjYW5jZWxsZWQsIHRoZSBSb3V0ZXIgd2lsbCB0cmlnZ2VyIGEgZm9yd2FyZCBuYXZpZ2F0aW9uXG4gICAqIGFuZCB2aWNlIHZlcnNhLlxuICAgKlxuICAgKiBOb3RlOiB0aGUgJ2NvbXB1dGVkJyBvcHRpb24gaXMgaW5jb21wYXRpYmxlIHdpdGggYW55IGBVcmxIYW5kbGluZ1N0cmF0ZWd5YCB3aGljaCBvbmx5XG4gICAqIGhhbmRsZXMgYSBwb3J0aW9uIG9mIHRoZSBVUkwgYmVjYXVzZSB0aGUgaGlzdG9yeSByZXN0b3JhdGlvbiBuYXZpZ2F0ZXMgdG8gdGhlIHByZXZpb3VzIHBsYWNlIGluXG4gICAqIHRoZSBicm93c2VyIGhpc3RvcnkgcmF0aGVyIHRoYW4gc2ltcGx5IHJlc2V0dGluZyBhIHBvcnRpb24gb2YgdGhlIFVSTC5cbiAgICpcbiAgICogVGhlIGRlZmF1bHQgdmFsdWUgaXMgYHJlcGxhY2VgIHdoZW4gbm90IHNldC5cbiAgICovXG4gIGNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24/OiAncmVwbGFjZSd8J2NvbXB1dGVkJztcblxuICAvKipcbiAgICogQ29uZmlndXJlcyB0aGUgZGVmYXVsdCBmb3IgaGFuZGxpbmcgYSBuYXZpZ2F0aW9uIHJlcXVlc3QgdG8gdGhlIGN1cnJlbnQgVVJMLlxuICAgKlxuICAgKiBJZiB1bnNldCwgdGhlIGBSb3V0ZXJgIHdpbGwgdXNlIGAnaWdub3JlJ2AuXG4gICAqXG4gICAqIEBzZWUge0BsaW5rIE9uU2FtZVVybE5hdmlnYXRpb259XG4gICAqL1xuICBvblNhbWVVcmxOYXZpZ2F0aW9uPzogT25TYW1lVXJsTmF2aWdhdGlvbjtcblxuICAvKipcbiAgICogRGVmaW5lcyBob3cgdGhlIHJvdXRlciBtZXJnZXMgcGFyYW1ldGVycywgZGF0YSwgYW5kIHJlc29sdmVkIGRhdGEgZnJvbSBwYXJlbnQgdG8gY2hpbGRcbiAgICogcm91dGVzLlxuICAgKlxuICAgKiBCeSBkZWZhdWx0ICgnZW1wdHlPbmx5JyksIGEgcm91dGUgaW5oZXJpdHMgdGhlIHBhcmVudCByb3V0ZSdzIHBhcmFtZXRlcnMgd2hlbiB0aGUgcm91dGUgaXRzZWxmXG4gICAqIGhhcyBhbiBlbXB0eSBwYXRoIChtZWFuaW5nIGl0cyBjb25maWd1cmVkIHdpdGggcGF0aDogJycpIG9yIHdoZW4gdGhlIHBhcmVudCByb3V0ZSBkb2Vzbid0IGhhdmVcbiAgICogYW55IGNvbXBvbmVudCBzZXQuXG4gICAqXG4gICAqIFNldCB0byAnYWx3YXlzJyB0byBlbmFibGUgdW5jb25kaXRpb25hbCBpbmhlcml0YW5jZSBvZiBwYXJlbnQgcGFyYW1ldGVycy5cbiAgICpcbiAgICogTm90ZSB0aGF0IHdoZW4gZGVhbGluZyB3aXRoIG1hdHJpeCBwYXJhbWV0ZXJzLCBcInBhcmVudFwiIHJlZmVycyB0byB0aGUgcGFyZW50IGBSb3V0ZWBcbiAgICogY29uZmlnIHdoaWNoIGRvZXMgbm90IG5lY2Vzc2FyaWx5IG1lYW4gdGhlIFwiVVJMIHNlZ21lbnQgdG8gdGhlIGxlZnRcIi4gV2hlbiB0aGUgYFJvdXRlYCBgcGF0aGBcbiAgICogY29udGFpbnMgbXVsdGlwbGUgc2VnbWVudHMsIHRoZSBtYXRyaXggcGFyYW1ldGVycyBtdXN0IGFwcGVhciBvbiB0aGUgbGFzdCBzZWdtZW50LiBGb3IgZXhhbXBsZSxcbiAgICogbWF0cml4IHBhcmFtZXRlcnMgZm9yIGB7cGF0aDogJ2EvYicsIGNvbXBvbmVudDogTXlDb21wfWAgc2hvdWxkIGFwcGVhciBhcyBgYS9iO2Zvbz1iYXJgIGFuZCBub3RcbiAgICogYGE7Zm9vPWJhci9iYC5cbiAgICpcbiAgICovXG4gIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k/OiAnZW1wdHlPbmx5J3wnYWx3YXlzJztcblxuICAvKipcbiAgICogRGVmaW5lcyB3aGVuIHRoZSByb3V0ZXIgdXBkYXRlcyB0aGUgYnJvd3NlciBVUkwuIEJ5IGRlZmF1bHQgKCdkZWZlcnJlZCcpLFxuICAgKiB1cGRhdGUgYWZ0ZXIgc3VjY2Vzc2Z1bCBuYXZpZ2F0aW9uLlxuICAgKiBTZXQgdG8gJ2VhZ2VyJyBpZiBwcmVmZXIgdG8gdXBkYXRlIHRoZSBVUkwgYXQgdGhlIGJlZ2lubmluZyBvZiBuYXZpZ2F0aW9uLlxuICAgKiBVcGRhdGluZyB0aGUgVVJMIGVhcmx5IGFsbG93cyB5b3UgdG8gaGFuZGxlIGEgZmFpbHVyZSBvZiBuYXZpZ2F0aW9uIGJ5XG4gICAqIHNob3dpbmcgYW4gZXJyb3IgbWVzc2FnZSB3aXRoIHRoZSBVUkwgdGhhdCBmYWlsZWQuXG4gICAqL1xuICB1cmxVcGRhdGVTdHJhdGVneT86ICdkZWZlcnJlZCd8J2VhZ2VyJztcblxuICAvKipcbiAgICogV2hlbiBgdHJ1ZWAsIHRoZSBgUHJvbWlzZWAgd2lsbCBpbnN0ZWFkIHJlc29sdmUgd2l0aCBgZmFsc2VgLCBhcyBpdCBkb2VzIHdpdGggb3RoZXIgZmFpbGVkXG4gICAqIG5hdmlnYXRpb25zIChmb3IgZXhhbXBsZSwgd2hlbiBndWFyZHMgYXJlIHJlamVjdGVkKS5cblxuICAgKiBPdGhlcndpc2UgdGhlIGBQcm9taXNlYCByZXR1cm5lZCBieSB0aGUgUm91dGVyJ3MgbmF2aWdhdGlvbiB3aXRoIGJlIHJlamVjdGVkXG4gICAqIGlmIGFuIGVycm9yIG9jY3Vycy5cbiAgICovXG4gIHJlc29sdmVOYXZpZ2F0aW9uUHJvbWlzZU9uRXJyb3I/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIHNjcm9sbGluZyBmZWF0dXJlIHdoaWNoIGNhbiBiZSB1c2VkIHdpdGggYHdpdGhJbk1lbW9yeVNjcm9sbGluZ2BcbiAqIGZ1bmN0aW9uLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJbk1lbW9yeVNjcm9sbGluZ09wdGlvbnMge1xuICAvKipcbiAgICogV2hlbiBzZXQgdG8gJ2VuYWJsZWQnLCBzY3JvbGxzIHRvIHRoZSBhbmNob3IgZWxlbWVudCB3aGVuIHRoZSBVUkwgaGFzIGEgZnJhZ21lbnQuXG4gICAqIEFuY2hvciBzY3JvbGxpbmcgaXMgZGlzYWJsZWQgYnkgZGVmYXVsdC5cbiAgICpcbiAgICogQW5jaG9yIHNjcm9sbGluZyBkb2VzIG5vdCBoYXBwZW4gb24gJ3BvcHN0YXRlJy4gSW5zdGVhZCwgd2UgcmVzdG9yZSB0aGUgcG9zaXRpb25cbiAgICogdGhhdCB3ZSBzdG9yZWQgb3Igc2Nyb2xsIHRvIHRoZSB0b3AuXG4gICAqL1xuICBhbmNob3JTY3JvbGxpbmc/OiAnZGlzYWJsZWQnfCdlbmFibGVkJztcblxuICAvKipcbiAgICogQ29uZmlndXJlcyBpZiB0aGUgc2Nyb2xsIHBvc2l0aW9uIG5lZWRzIHRvIGJlIHJlc3RvcmVkIHdoZW4gbmF2aWdhdGluZyBiYWNrLlxuICAgKlxuICAgKiAqICdkaXNhYmxlZCctIChEZWZhdWx0KSBEb2VzIG5vdGhpbmcuIFNjcm9sbCBwb3NpdGlvbiBpcyBtYWludGFpbmVkIG9uIG5hdmlnYXRpb24uXG4gICAqICogJ3RvcCctIFNldHMgdGhlIHNjcm9sbCBwb3NpdGlvbiB0byB4ID0gMCwgeSA9IDAgb24gYWxsIG5hdmlnYXRpb24uXG4gICAqICogJ2VuYWJsZWQnLSBSZXN0b3JlcyB0aGUgcHJldmlvdXMgc2Nyb2xsIHBvc2l0aW9uIG9uIGJhY2t3YXJkIG5hdmlnYXRpb24sIGVsc2Ugc2V0cyB0aGVcbiAgICogcG9zaXRpb24gdG8gdGhlIGFuY2hvciBpZiBvbmUgaXMgcHJvdmlkZWQsIG9yIHNldHMgdGhlIHNjcm9sbCBwb3NpdGlvbiB0byBbMCwgMF0gKGZvcndhcmRcbiAgICogbmF2aWdhdGlvbikuIFRoaXMgb3B0aW9uIHdpbGwgYmUgdGhlIGRlZmF1bHQgaW4gdGhlIGZ1dHVyZS5cbiAgICpcbiAgICogWW91IGNhbiBpbXBsZW1lbnQgY3VzdG9tIHNjcm9sbCByZXN0b3JhdGlvbiBiZWhhdmlvciBieSBhZGFwdGluZyB0aGUgZW5hYmxlZCBiZWhhdmlvciBhc1xuICAgKiBpbiB0aGUgZm9sbG93aW5nIGV4YW1wbGUuXG4gICAqXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY2xhc3MgQXBwQ29tcG9uZW50IHtcbiAgICogICBtb3ZpZURhdGE6IGFueTtcbiAgICpcbiAgICogICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJvdXRlcjogUm91dGVyLCBwcml2YXRlIHZpZXdwb3J0U2Nyb2xsZXI6IFZpZXdwb3J0U2Nyb2xsZXIsXG4gICAqIGNoYW5nZURldGVjdG9yUmVmOiBDaGFuZ2VEZXRlY3RvclJlZikge1xuICAgKiAgIHJvdXRlci5ldmVudHMucGlwZShmaWx0ZXIoKGV2ZW50OiBFdmVudCk6IGV2ZW50IGlzIFNjcm9sbCA9PiBldmVudCBpbnN0YW5jZW9mIFNjcm9sbClcbiAgICogICAgICkuc3Vic2NyaWJlKGUgPT4ge1xuICAgKiAgICAgICBmZXRjaCgnaHR0cDovL2V4YW1wbGUuY29tL21vdmllcy5qc29uJykudGhlbihyZXNwb25zZSA9PiB7XG4gICAqICAgICAgICAgdGhpcy5tb3ZpZURhdGEgPSByZXNwb25zZS5qc29uKCk7XG4gICAqICAgICAgICAgLy8gdXBkYXRlIHRoZSB0ZW1wbGF0ZSB3aXRoIHRoZSBkYXRhIGJlZm9yZSByZXN0b3Jpbmcgc2Nyb2xsXG4gICAqICAgICAgICAgY2hhbmdlRGV0ZWN0b3JSZWYuZGV0ZWN0Q2hhbmdlcygpO1xuICAgKlxuICAgKiAgICAgICAgIGlmIChlLnBvc2l0aW9uKSB7XG4gICAqICAgICAgICAgICB2aWV3cG9ydFNjcm9sbGVyLnNjcm9sbFRvUG9zaXRpb24oZS5wb3NpdGlvbik7XG4gICAqICAgICAgICAgfVxuICAgKiAgICAgICB9KTtcbiAgICogICAgIH0pO1xuICAgKiAgIH1cbiAgICogfVxuICAgKiBgYGBcbiAgICovXG4gIHNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb24/OiAnZGlzYWJsZWQnfCdlbmFibGVkJ3wndG9wJztcbn1cblxuLyoqXG4gKiBBIHNldCBvZiBjb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIGEgcm91dGVyIG1vZHVsZSwgcHJvdmlkZWQgaW4gdGhlXG4gKiBgZm9yUm9vdCgpYCBtZXRob2QuXG4gKlxuICogQHNlZSB7QGxpbmsgZm9yUm9vdCgpfVxuICpcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXh0cmFPcHRpb25zIGV4dGVuZHMgSW5NZW1vcnlTY3JvbGxpbmdPcHRpb25zLCBSb3V0ZXJDb25maWdPcHRpb25zIHtcbiAgLyoqXG4gICAqIFdoZW4gdHJ1ZSwgbG9nIGFsbCBpbnRlcm5hbCBuYXZpZ2F0aW9uIGV2ZW50cyB0byB0aGUgY29uc29sZS5cbiAgICogVXNlIGZvciBkZWJ1Z2dpbmcuXG4gICAqL1xuICBlbmFibGVUcmFjaW5nPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hlbiB0cnVlLCBlbmFibGUgdGhlIGxvY2F0aW9uIHN0cmF0ZWd5IHRoYXQgdXNlcyB0aGUgVVJMIGZyYWdtZW50XG4gICAqIGluc3RlYWQgb2YgdGhlIGhpc3RvcnkgQVBJLlxuICAgKi9cbiAgdXNlSGFzaD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIE9uZSBvZiBgZW5hYmxlZGAsIGBlbmFibGVkQmxvY2tpbmdgLCBgZW5hYmxlZE5vbkJsb2NraW5nYCBvciBgZGlzYWJsZWRgLlxuICAgKiBXaGVuIHNldCB0byBgZW5hYmxlZGAgb3IgYGVuYWJsZWRCbG9ja2luZ2AsIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gc3RhcnRzIGJlZm9yZSB0aGUgcm9vdFxuICAgKiBjb21wb25lbnQgaXMgY3JlYXRlZC4gVGhlIGJvb3RzdHJhcCBpcyBibG9ja2VkIHVudGlsIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gaXMgY29tcGxldGUuIFRoaXNcbiAgICogdmFsdWUgaXMgcmVxdWlyZWQgZm9yIFtzZXJ2ZXItc2lkZSByZW5kZXJpbmddKGd1aWRlL3NzcikgdG8gd29yay4gV2hlbiBzZXQgdG9cbiAgICogYGVuYWJsZWROb25CbG9ja2luZ2AsIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gc3RhcnRzIGFmdGVyIHRoZSByb290IGNvbXBvbmVudCBoYXMgYmVlbiBjcmVhdGVkLlxuICAgKiBUaGUgYm9vdHN0cmFwIGlzIG5vdCBibG9ja2VkIG9uIHRoZSBjb21wbGV0aW9uIG9mIHRoZSBpbml0aWFsIG5hdmlnYXRpb24uIFdoZW4gc2V0IHRvXG4gICAqIGBkaXNhYmxlZGAsIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gaXMgbm90IHBlcmZvcm1lZC4gVGhlIGxvY2F0aW9uIGxpc3RlbmVyIGlzIHNldCB1cCBiZWZvcmUgdGhlXG4gICAqIHJvb3QgY29tcG9uZW50IGdldHMgY3JlYXRlZC4gVXNlIGlmIHRoZXJlIGlzIGEgcmVhc29uIHRvIGhhdmUgbW9yZSBjb250cm9sIG92ZXIgd2hlbiB0aGUgcm91dGVyXG4gICAqIHN0YXJ0cyBpdHMgaW5pdGlhbCBuYXZpZ2F0aW9uIGR1ZSB0byBzb21lIGNvbXBsZXggaW5pdGlhbGl6YXRpb24gbG9naWMuXG4gICAqL1xuICBpbml0aWFsTmF2aWdhdGlvbj86IEluaXRpYWxOYXZpZ2F0aW9uO1xuXG4gIC8qKlxuICAgKiBXaGVuIHRydWUsIGVuYWJsZXMgYmluZGluZyBpbmZvcm1hdGlvbiBmcm9tIHRoZSBgUm91dGVyYCBzdGF0ZSBkaXJlY3RseSB0byB0aGUgaW5wdXRzIG9mIHRoZVxuICAgKiBjb21wb25lbnQgaW4gYFJvdXRlYCBjb25maWd1cmF0aW9ucy5cbiAgICovXG4gIGJpbmRUb0NvbXBvbmVudElucHV0cz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZW4gdHJ1ZSwgZW5hYmxlcyB2aWV3IHRyYW5zaXRpb25zIGluIHRoZSBSb3V0ZXIgYnkgcnVubmluZyB0aGUgcm91dGUgYWN0aXZhdGlvbiBhbmRcbiAgICogZGVhY3RpdmF0aW9uIGluc2lkZSBvZiBgZG9jdW1lbnQuc3RhcnRWaWV3VHJhbnNpdGlvbmAuXG4gICAqXG4gICAqIEBzZWUgaHR0cHM6Ly9kZXZlbG9wZXIuY2hyb21lLmNvbS9kb2NzL3dlYi1wbGF0Zm9ybS92aWV3LXRyYW5zaXRpb25zL1xuICAgKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9WaWV3X1RyYW5zaXRpb25zX0FQSVxuICAgKiBAZXhwZXJpbWVudGFsXG4gICAqL1xuICBlbmFibGVWaWV3VHJhbnNpdGlvbnM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBBIGN1c3RvbSBlcnJvciBoYW5kbGVyIGZvciBmYWlsZWQgbmF2aWdhdGlvbnMuXG4gICAqIElmIHRoZSBoYW5kbGVyIHJldHVybnMgYSB2YWx1ZSwgdGhlIG5hdmlnYXRpb24gUHJvbWlzZSBpcyByZXNvbHZlZCB3aXRoIHRoaXMgdmFsdWUuXG4gICAqIElmIHRoZSBoYW5kbGVyIHRocm93cyBhbiBleGNlcHRpb24sIHRoZSBuYXZpZ2F0aW9uIFByb21pc2UgaXMgcmVqZWN0ZWQgd2l0aCB0aGUgZXhjZXB0aW9uLlxuICAgKlxuICAgKiBAZGVwcmVjYXRlZCBTdWJzY3JpYmUgdG8gdGhlIGBSb3V0ZXJgIGV2ZW50cyBhbmQgd2F0Y2ggZm9yIGBOYXZpZ2F0aW9uRXJyb3JgIGluc3RlYWQuXG4gICAqICAgSWYgdGhlIEVycm9ySGFuZGxlciBpcyB1c2VkIHRvIHByZXZlbnQgdW5oYW5kbGVkIHByb21pc2UgcmVqZWN0aW9ucyB3aGVuIG5hdmlnYXRpb25cbiAgICogICBlcnJvcnMgb2NjdXIsIHVzZSB0aGUgYHJlc29sdmVOYXZpZ2F0aW9uUHJvbWlzZU9uRXJyb3JgIG9wdGlvbiBpbnN0ZWFkLlxuICAgKlxuICAgKiBAc2VlIFJvdXRlckNvbmZpZ09wdGlvbnNcbiAgICovXG4gIGVycm9ySGFuZGxlcj86IChlcnJvcjogYW55KSA9PiBhbnk7XG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZXMgYSBwcmVsb2FkaW5nIHN0cmF0ZWd5LlxuICAgKiBPbmUgb2YgYFByZWxvYWRBbGxNb2R1bGVzYCBvciBgTm9QcmVsb2FkaW5nYCAodGhlIGRlZmF1bHQpLlxuICAgKi9cbiAgcHJlbG9hZGluZ1N0cmF0ZWd5PzogYW55O1xuXG4gIC8qKlxuICAgKiBDb25maWd1cmVzIHRoZSBzY3JvbGwgb2Zmc2V0IHRoZSByb3V0ZXIgd2lsbCB1c2Ugd2hlbiBzY3JvbGxpbmcgdG8gYW4gZWxlbWVudC5cbiAgICpcbiAgICogV2hlbiBnaXZlbiBhIHR1cGxlIHdpdGggeCBhbmQgeSBwb3NpdGlvbiB2YWx1ZSxcbiAgICogdGhlIHJvdXRlciB1c2VzIHRoYXQgb2Zmc2V0IGVhY2ggdGltZSBpdCBzY3JvbGxzLlxuICAgKiBXaGVuIGdpdmVuIGEgZnVuY3Rpb24sIHRoZSByb3V0ZXIgaW52b2tlcyB0aGUgZnVuY3Rpb24gZXZlcnkgdGltZVxuICAgKiBpdCByZXN0b3JlcyBzY3JvbGwgcG9zaXRpb24uXG4gICAqL1xuICBzY3JvbGxPZmZzZXQ/OiBbbnVtYmVyLCBudW1iZXJdfCgoKSA9PiBbbnVtYmVyLCBudW1iZXJdKTtcbn1cblxuLyoqXG4gKiBBIFtESSB0b2tlbl0oZ3VpZGUvZ2xvc3NhcnkvI2RpLXRva2VuKSBmb3IgdGhlIHJvdXRlciBzZXJ2aWNlLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUl9DT05GSUdVUkFUSU9OID0gbmV3IEluamVjdGlvblRva2VuPEV4dHJhT3B0aW9ucz4oXG4gICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgPyAncm91dGVyIGNvbmZpZycgOiAnJywge1xuICAgICAgcHJvdmlkZWRJbjogJ3Jvb3QnLFxuICAgICAgZmFjdG9yeTogKCkgPT4gKHt9KSxcbiAgICB9KTtcbiJdfQ==