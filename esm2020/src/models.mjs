/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export {};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9tb2RlbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RW52aXJvbm1lbnRJbmplY3RvciwgTmdNb2R1bGVGYWN0b3J5LCBQcm92aWRlciwgVHlwZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge09ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3QsIFJvdXRlclN0YXRlU25hcHNob3R9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7VXJsU2VnbWVudCwgVXJsU2VnbWVudEdyb3VwLCBVcmxUcmVlfSBmcm9tICcuL3VybF90cmVlJztcblxuXG4vKipcbiAqIFJlcHJlc2VudHMgYSByb3V0ZSBjb25maWd1cmF0aW9uIGZvciB0aGUgUm91dGVyIHNlcnZpY2UuXG4gKiBBbiBhcnJheSBvZiBgUm91dGVgIG9iamVjdHMsIHVzZWQgaW4gYFJvdXRlci5jb25maWdgIGFuZCBmb3IgbmVzdGVkIHJvdXRlIGNvbmZpZ3VyYXRpb25zXG4gKiBpbiBgUm91dGUuY2hpbGRyZW5gLlxuICpcbiAqIEBzZWUgYFJvdXRlYFxuICogQHNlZSBgUm91dGVyYFxuICogQHNlZSBbUm91dGVyIGNvbmZpZ3VyYXRpb24gZ3VpZGVdKGd1aWRlL3JvdXRlci1yZWZlcmVuY2UjY29uZmlndXJhdGlvbilcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgUm91dGVzID0gUm91dGVbXTtcblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSByZXN1bHQgb2YgbWF0Y2hpbmcgVVJMcyB3aXRoIGEgY3VzdG9tIG1hdGNoaW5nIGZ1bmN0aW9uLlxuICpcbiAqICogYGNvbnN1bWVkYCBpcyBhbiBhcnJheSBvZiB0aGUgY29uc3VtZWQgVVJMIHNlZ21lbnRzLlxuICogKiBgcG9zUGFyYW1zYCBpcyBhIG1hcCBvZiBwb3NpdGlvbmFsIHBhcmFtZXRlcnMuXG4gKlxuICogQHNlZSBgVXJsTWF0Y2hlcigpYFxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBVcmxNYXRjaFJlc3VsdCA9IHtcbiAgY29uc3VtZWQ6IFVybFNlZ21lbnRbXTtcbiAgcG9zUGFyYW1zPzoge1tuYW1lOiBzdHJpbmddOiBVcmxTZWdtZW50fTtcbn07XG5cbi8qKlxuICogQSBmdW5jdGlvbiBmb3IgbWF0Y2hpbmcgYSByb3V0ZSBhZ2FpbnN0IFVSTHMuIEltcGxlbWVudCBhIGN1c3RvbSBVUkwgbWF0Y2hlclxuICogZm9yIGBSb3V0ZS5tYXRjaGVyYCB3aGVuIGEgY29tYmluYXRpb24gb2YgYHBhdGhgIGFuZCBgcGF0aE1hdGNoYFxuICogaXMgbm90IGV4cHJlc3NpdmUgZW5vdWdoLiBDYW5ub3QgYmUgdXNlZCB0b2dldGhlciB3aXRoIGBwYXRoYCBhbmQgYHBhdGhNYXRjaGAuXG4gKlxuICogVGhlIGZ1bmN0aW9uIHRha2VzIHRoZSBmb2xsb3dpbmcgYXJndW1lbnRzIGFuZCByZXR1cm5zIGEgYFVybE1hdGNoUmVzdWx0YCBvYmplY3QuXG4gKiAqICpzZWdtZW50cyogOiBBbiBhcnJheSBvZiBVUkwgc2VnbWVudHMuXG4gKiAqICpncm91cCogOiBBIHNlZ21lbnQgZ3JvdXAuXG4gKiAqICpyb3V0ZSogOiBUaGUgcm91dGUgdG8gbWF0Y2ggYWdhaW5zdC5cbiAqXG4gKiBUaGUgZm9sbG93aW5nIGV4YW1wbGUgaW1wbGVtZW50YXRpb24gbWF0Y2hlcyBIVE1MIGZpbGVzLlxuICpcbiAqIGBgYFxuICogZXhwb3J0IGZ1bmN0aW9uIGh0bWxGaWxlcyh1cmw6IFVybFNlZ21lbnRbXSkge1xuICogICByZXR1cm4gdXJsLmxlbmd0aCA9PT0gMSAmJiB1cmxbMF0ucGF0aC5lbmRzV2l0aCgnLmh0bWwnKSA/ICh7Y29uc3VtZWQ6IHVybH0pIDogbnVsbDtcbiAqIH1cbiAqXG4gKiBleHBvcnQgY29uc3Qgcm91dGVzID0gW3sgbWF0Y2hlcjogaHRtbEZpbGVzLCBjb21wb25lbnQ6IEFueUNvbXBvbmVudCB9XTtcbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgVXJsTWF0Y2hlciA9IChzZWdtZW50czogVXJsU2VnbWVudFtdLCBncm91cDogVXJsU2VnbWVudEdyb3VwLCByb3V0ZTogUm91dGUpID0+XG4gICAgVXJsTWF0Y2hSZXN1bHR8bnVsbDtcblxuLyoqXG4gKlxuICogUmVwcmVzZW50cyBzdGF0aWMgZGF0YSBhc3NvY2lhdGVkIHdpdGggYSBwYXJ0aWN1bGFyIHJvdXRlLlxuICpcbiAqIEBzZWUgYFJvdXRlI2RhdGFgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBEYXRhID0ge1xuICBba2V5OiBzdHJpbmd8c3ltYm9sXTogYW55XG59O1xuXG4vKipcbiAqXG4gKiBSZXByZXNlbnRzIHRoZSByZXNvbHZlZCBkYXRhIGFzc29jaWF0ZWQgd2l0aCBhIHBhcnRpY3VsYXIgcm91dGUuXG4gKlxuICogQHNlZSBgUm91dGUjcmVzb2x2ZWAuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBSZXNvbHZlRGF0YSA9IHtcbiAgW2tleTogc3RyaW5nfHN5bWJvbF06IGFueVxufTtcblxuLyoqXG4gKlxuICogQSBmdW5jdGlvbiB0aGF0IGlzIGNhbGxlZCB0byByZXNvbHZlIGEgY29sbGVjdGlvbiBvZiBsYXp5LWxvYWRlZCByb3V0ZXMuXG4gKiBNdXN0IGJlIGFuIGFycm93IGZ1bmN0aW9uIG9mIHRoZSBmb2xsb3dpbmcgZm9ybTpcbiAqIGAoKSA9PiBpbXBvcnQoJy4uLicpLnRoZW4obW9kID0+IG1vZC5NT0RVTEUpYFxuICogb3JcbiAqIGAoKSA9PiBpbXBvcnQoJy4uLicpLnRoZW4obW9kID0+IG1vZC5ST1VURVMpYFxuICpcbiAqIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgcGF0aDogJ2xhenknLFxuICogICBsb2FkQ2hpbGRyZW46ICgpID0+IGltcG9ydCgnLi9sYXp5LXJvdXRlL2xhenkubW9kdWxlJykudGhlbihtb2QgPT4gbW9kLkxhenlNb2R1bGUpLFxuICogfV07XG4gKiBgYGBcbiAqIG9yXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICdsYXp5JyxcbiAqICAgbG9hZENoaWxkcmVuOiAoKSA9PiBpbXBvcnQoJy4vbGF6eS1yb3V0ZS9sYXp5LnJvdXRlcycpLnRoZW4obW9kID0+IG1vZC5ST1VURVMpLFxuICogfV07XG4gKiBgYGBcbiAqXG4gKiBAc2VlIFtSb3V0ZS5sb2FkQ2hpbGRyZW5dKGFwaS9yb3V0ZXIvUm91dGUjbG9hZENoaWxkcmVuKVxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBMb2FkQ2hpbGRyZW5DYWxsYmFjayA9ICgpID0+IFR5cGU8YW55PnxOZ01vZHVsZUZhY3Rvcnk8YW55PnxSb3V0ZXN8XG4gICAgT2JzZXJ2YWJsZTxUeXBlPGFueT58Um91dGVzPnxQcm9taXNlPE5nTW9kdWxlRmFjdG9yeTxhbnk+fFR5cGU8YW55PnxSb3V0ZXM+O1xuXG4vKipcbiAqXG4gKiBBIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHNldCBvZiByb3V0ZXMgdG8gbG9hZC5cbiAqXG4gKiBAc2VlIGBMb2FkQ2hpbGRyZW5DYWxsYmFja2BcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgTG9hZENoaWxkcmVuID0gTG9hZENoaWxkcmVuQ2FsbGJhY2s7XG5cbi8qKlxuICpcbiAqIEhvdyB0byBoYW5kbGUgcXVlcnkgcGFyYW1ldGVycyBpbiBhIHJvdXRlciBsaW5rLlxuICogT25lIG9mOlxuICogLSBgbWVyZ2VgIDogTWVyZ2UgbmV3IHdpdGggY3VycmVudCBwYXJhbWV0ZXJzLlxuICogLSBgcHJlc2VydmVgIDogUHJlc2VydmUgY3VycmVudCBwYXJhbWV0ZXJzLlxuICpcbiAqIEBzZWUgYFVybENyZWF0aW9uT3B0aW9ucyNxdWVyeVBhcmFtc0hhbmRsaW5nYFxuICogQHNlZSBgUm91dGVyTGlua2BcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgUXVlcnlQYXJhbXNIYW5kbGluZyA9ICdtZXJnZSd8J3ByZXNlcnZlJ3wnJztcblxuLyoqXG4gKlxuICogQSBwb2xpY3kgZm9yIHdoZW4gdG8gcnVuIGd1YXJkcyBhbmQgcmVzb2x2ZXJzIG9uIGEgcm91dGUuXG4gKlxuICogQHNlZSBbUm91dGUucnVuR3VhcmRzQW5kUmVzb2x2ZXJzXShhcGkvcm91dGVyL1JvdXRlI3J1bkd1YXJkc0FuZFJlc29sdmVycylcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgUnVuR3VhcmRzQW5kUmVzb2x2ZXJzID1cbiAgICAncGF0aFBhcmFtc0NoYW5nZSd8J3BhdGhQYXJhbXNPclF1ZXJ5UGFyYW1zQ2hhbmdlJ3wncGFyYW1zQ2hhbmdlJ3wncGFyYW1zT3JRdWVyeVBhcmFtc0NoYW5nZSd8XG4gICAgJ2Fsd2F5cyd8KChmcm9tOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCB0bzogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCkgPT4gYm9vbGVhbik7XG5cbi8qKlxuICogQSBjb25maWd1cmF0aW9uIG9iamVjdCB0aGF0IGRlZmluZXMgYSBzaW5nbGUgcm91dGUuXG4gKiBBIHNldCBvZiByb3V0ZXMgYXJlIGNvbGxlY3RlZCBpbiBhIGBSb3V0ZXNgIGFycmF5IHRvIGRlZmluZSBhIGBSb3V0ZXJgIGNvbmZpZ3VyYXRpb24uXG4gKiBUaGUgcm91dGVyIGF0dGVtcHRzIHRvIG1hdGNoIHNlZ21lbnRzIG9mIGEgZ2l2ZW4gVVJMIGFnYWluc3QgZWFjaCByb3V0ZSxcbiAqIHVzaW5nIHRoZSBjb25maWd1cmF0aW9uIG9wdGlvbnMgZGVmaW5lZCBpbiB0aGlzIG9iamVjdC5cbiAqXG4gKiBTdXBwb3J0cyBzdGF0aWMsIHBhcmFtZXRlcml6ZWQsIHJlZGlyZWN0LCBhbmQgd2lsZGNhcmQgcm91dGVzLCBhcyB3ZWxsIGFzXG4gKiBjdXN0b20gcm91dGUgZGF0YSBhbmQgcmVzb2x2ZSBtZXRob2RzLlxuICpcbiAqIEZvciBkZXRhaWxlZCB1c2FnZSBpbmZvcm1hdGlvbiwgc2VlIHRoZSBbUm91dGluZyBHdWlkZV0oZ3VpZGUvcm91dGVyKS5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqICMjIyBTaW1wbGUgQ29uZmlndXJhdGlvblxuICpcbiAqIFRoZSBmb2xsb3dpbmcgcm91dGUgc3BlY2lmaWVzIHRoYXQgd2hlbiBuYXZpZ2F0aW5nIHRvLCBmb3IgZXhhbXBsZSxcbiAqIGAvdGVhbS8xMS91c2VyL2JvYmAsIHRoZSByb3V0ZXIgY3JlYXRlcyB0aGUgJ1RlYW0nIGNvbXBvbmVudFxuICogd2l0aCB0aGUgJ1VzZXInIGNoaWxkIGNvbXBvbmVudCBpbiBpdC5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gKiAgY29tcG9uZW50OiBUZWFtLFxuICogICBjaGlsZHJlbjogW3tcbiAqICAgICBwYXRoOiAndXNlci86bmFtZScsXG4gKiAgICAgY29tcG9uZW50OiBVc2VyXG4gKiAgIH1dXG4gKiB9XVxuICogYGBgXG4gKlxuICogIyMjIE11bHRpcGxlIE91dGxldHNcbiAqXG4gKiBUaGUgZm9sbG93aW5nIHJvdXRlIGNyZWF0ZXMgc2libGluZyBjb21wb25lbnRzIHdpdGggbXVsdGlwbGUgb3V0bGV0cy5cbiAqIFdoZW4gbmF2aWdhdGluZyB0byBgL3RlYW0vMTEoYXV4OmNoYXQvamltKWAsIHRoZSByb3V0ZXIgY3JlYXRlcyB0aGUgJ1RlYW0nIGNvbXBvbmVudCBuZXh0IHRvXG4gKiB0aGUgJ0NoYXQnIGNvbXBvbmVudC4gVGhlICdDaGF0JyBjb21wb25lbnQgaXMgcGxhY2VkIGludG8gdGhlICdhdXgnIG91dGxldC5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gKiAgIGNvbXBvbmVudDogVGVhbVxuICogfSwge1xuICogICBwYXRoOiAnY2hhdC86dXNlcicsXG4gKiAgIGNvbXBvbmVudDogQ2hhdFxuICogICBvdXRsZXQ6ICdhdXgnXG4gKiB9XVxuICogYGBgXG4gKlxuICogIyMjIFdpbGQgQ2FyZHNcbiAqXG4gKiBUaGUgZm9sbG93aW5nIHJvdXRlIHVzZXMgd2lsZC1jYXJkIG5vdGF0aW9uIHRvIHNwZWNpZnkgYSBjb21wb25lbnRcbiAqIHRoYXQgaXMgYWx3YXlzIGluc3RhbnRpYXRlZCByZWdhcmRsZXNzIG9mIHdoZXJlIHlvdSBuYXZpZ2F0ZSB0by5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICcqKicsXG4gKiAgIGNvbXBvbmVudDogV2lsZGNhcmRDb21wb25lbnRcbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiAjIyMgUmVkaXJlY3RzXG4gKlxuICogVGhlIGZvbGxvd2luZyByb3V0ZSB1c2VzIHRoZSBgcmVkaXJlY3RUb2AgcHJvcGVydHkgdG8gaWdub3JlIGEgc2VnbWVudCBvZlxuICogYSBnaXZlbiBVUkwgd2hlbiBsb29raW5nIGZvciBhIGNoaWxkIHBhdGguXG4gKlxuICogV2hlbiBuYXZpZ2F0aW5nIHRvICcvdGVhbS8xMS9sZWdhY3kvdXNlci9qaW0nLCB0aGUgcm91dGVyIGNoYW5nZXMgdGhlIFVSTCBzZWdtZW50XG4gKiAnL3RlYW0vMTEvbGVnYWN5L3VzZXIvamltJyB0byAnL3RlYW0vMTEvdXNlci9qaW0nLCBhbmQgdGhlbiBpbnN0YW50aWF0ZXNcbiAqIHRoZSBUZWFtIGNvbXBvbmVudCB3aXRoIHRoZSBVc2VyIGNoaWxkIGNvbXBvbmVudCBpbiBpdC5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gKiAgIGNvbXBvbmVudDogVGVhbSxcbiAqICAgY2hpbGRyZW46IFt7XG4gKiAgICAgcGF0aDogJ2xlZ2FjeS91c2VyLzpuYW1lJyxcbiAqICAgICByZWRpcmVjdFRvOiAndXNlci86bmFtZSdcbiAqICAgfSwge1xuICogICAgIHBhdGg6ICd1c2VyLzpuYW1lJyxcbiAqICAgICBjb21wb25lbnQ6IFVzZXJcbiAqICAgfV1cbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiBUaGUgcmVkaXJlY3QgcGF0aCBjYW4gYmUgcmVsYXRpdmUsIGFzIHNob3duIGluIHRoaXMgZXhhbXBsZSwgb3IgYWJzb2x1dGUuXG4gKiBJZiB3ZSBjaGFuZ2UgdGhlIGByZWRpcmVjdFRvYCB2YWx1ZSBpbiB0aGUgZXhhbXBsZSB0byB0aGUgYWJzb2x1dGUgVVJMIHNlZ21lbnQgJy91c2VyLzpuYW1lJyxcbiAqIHRoZSByZXN1bHQgVVJMIGlzIGFsc28gYWJzb2x1dGUsICcvdXNlci9qaW0nLlxuXG4gKiAjIyMgRW1wdHkgUGF0aFxuICpcbiAqIEVtcHR5LXBhdGggcm91dGUgY29uZmlndXJhdGlvbnMgY2FuIGJlIHVzZWQgdG8gaW5zdGFudGlhdGUgY29tcG9uZW50cyB0aGF0IGRvIG5vdCAnY29uc3VtZSdcbiAqIGFueSBVUkwgc2VnbWVudHMuXG4gKlxuICogSW4gdGhlIGZvbGxvd2luZyBjb25maWd1cmF0aW9uLCB3aGVuIG5hdmlnYXRpbmcgdG9cbiAqIGAvdGVhbS8xMWAsIHRoZSByb3V0ZXIgaW5zdGFudGlhdGVzIHRoZSAnQWxsVXNlcnMnIGNvbXBvbmVudC5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gKiAgIGNvbXBvbmVudDogVGVhbSxcbiAqICAgY2hpbGRyZW46IFt7XG4gKiAgICAgcGF0aDogJycsXG4gKiAgICAgY29tcG9uZW50OiBBbGxVc2Vyc1xuICogICB9LCB7XG4gKiAgICAgcGF0aDogJ3VzZXIvOm5hbWUnLFxuICogICAgIGNvbXBvbmVudDogVXNlclxuICogICB9XVxuICogfV1cbiAqIGBgYFxuICpcbiAqIEVtcHR5LXBhdGggcm91dGVzIGNhbiBoYXZlIGNoaWxkcmVuLiBJbiB0aGUgZm9sbG93aW5nIGV4YW1wbGUsIHdoZW4gbmF2aWdhdGluZ1xuICogdG8gYC90ZWFtLzExL3VzZXIvamltYCwgdGhlIHJvdXRlciBpbnN0YW50aWF0ZXMgdGhlIHdyYXBwZXIgY29tcG9uZW50IHdpdGhcbiAqIHRoZSB1c2VyIGNvbXBvbmVudCBpbiBpdC5cbiAqXG4gKiBOb3RlIHRoYXQgYW4gZW1wdHkgcGF0aCByb3V0ZSBpbmhlcml0cyBpdHMgcGFyZW50J3MgcGFyYW1ldGVycyBhbmQgZGF0YS5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gKiAgIGNvbXBvbmVudDogVGVhbSxcbiAqICAgY2hpbGRyZW46IFt7XG4gKiAgICAgcGF0aDogJycsXG4gKiAgICAgY29tcG9uZW50OiBXcmFwcGVyQ21wLFxuICogICAgIGNoaWxkcmVuOiBbe1xuICogICAgICAgcGF0aDogJ3VzZXIvOm5hbWUnLFxuICogICAgICAgY29tcG9uZW50OiBVc2VyXG4gKiAgICAgfV1cbiAqICAgfV1cbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiAjIyMgTWF0Y2hpbmcgU3RyYXRlZ3lcbiAqXG4gKiBUaGUgZGVmYXVsdCBwYXRoLW1hdGNoIHN0cmF0ZWd5IGlzICdwcmVmaXgnLCB3aGljaCBtZWFucyB0aGF0IHRoZSByb3V0ZXJcbiAqIGNoZWNrcyBVUkwgZWxlbWVudHMgZnJvbSB0aGUgbGVmdCB0byBzZWUgaWYgdGhlIFVSTCBtYXRjaGVzIGEgc3BlY2lmaWVkIHBhdGguXG4gKiBGb3IgZXhhbXBsZSwgJy90ZWFtLzExL3VzZXInIG1hdGNoZXMgJ3RlYW0vOmlkJy5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICcnLFxuICogICBwYXRoTWF0Y2g6ICdwcmVmaXgnLCAvL2RlZmF1bHRcbiAqICAgcmVkaXJlY3RUbzogJ21haW4nXG4gKiB9LCB7XG4gKiAgIHBhdGg6ICdtYWluJyxcbiAqICAgY29tcG9uZW50OiBNYWluXG4gKiB9XVxuICogYGBgXG4gKlxuICogWW91IGNhbiBzcGVjaWZ5IHRoZSBwYXRoLW1hdGNoIHN0cmF0ZWd5ICdmdWxsJyB0byBtYWtlIHN1cmUgdGhhdCB0aGUgcGF0aFxuICogY292ZXJzIHRoZSB3aG9sZSB1bmNvbnN1bWVkIFVSTC4gSXQgaXMgaW1wb3J0YW50IHRvIGRvIHRoaXMgd2hlbiByZWRpcmVjdGluZ1xuICogZW1wdHktcGF0aCByb3V0ZXMuIE90aGVyd2lzZSwgYmVjYXVzZSBhbiBlbXB0eSBwYXRoIGlzIGEgcHJlZml4IG9mIGFueSBVUkwsXG4gKiB0aGUgcm91dGVyIHdvdWxkIGFwcGx5IHRoZSByZWRpcmVjdCBldmVuIHdoZW4gbmF2aWdhdGluZyB0byB0aGUgcmVkaXJlY3QgZGVzdGluYXRpb24sXG4gKiBjcmVhdGluZyBhbiBlbmRsZXNzIGxvb3AuXG4gKlxuICogSW4gdGhlIGZvbGxvd2luZyBleGFtcGxlLCBzdXBwbHlpbmcgdGhlICdmdWxsJyBgcGF0aE1hdGNoYCBzdHJhdGVneSBlbnN1cmVzXG4gKiB0aGF0IHRoZSByb3V0ZXIgYXBwbGllcyB0aGUgcmVkaXJlY3QgaWYgYW5kIG9ubHkgaWYgbmF2aWdhdGluZyB0byAnLycuXG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAnJyxcbiAqICAgcGF0aE1hdGNoOiAnZnVsbCcsXG4gKiAgIHJlZGlyZWN0VG86ICdtYWluJ1xuICogfSwge1xuICogICBwYXRoOiAnbWFpbicsXG4gKiAgIGNvbXBvbmVudDogTWFpblxuICogfV1cbiAqIGBgYFxuICpcbiAqICMjIyBDb21wb25lbnRsZXNzIFJvdXRlc1xuICpcbiAqIFlvdSBjYW4gc2hhcmUgcGFyYW1ldGVycyBiZXR3ZWVuIHNpYmxpbmcgY29tcG9uZW50cy5cbiAqIEZvciBleGFtcGxlLCBzdXBwb3NlIHRoYXQgdHdvIHNpYmxpbmcgY29tcG9uZW50cyBzaG91bGQgZ28gbmV4dCB0byBlYWNoIG90aGVyLFxuICogYW5kIGJvdGggb2YgdGhlbSByZXF1aXJlIGFuIElEIHBhcmFtZXRlci4gWW91IGNhbiBhY2NvbXBsaXNoIHRoaXMgdXNpbmcgYSByb3V0ZVxuICogdGhhdCBkb2VzIG5vdCBzcGVjaWZ5IGEgY29tcG9uZW50IGF0IHRoZSB0b3AgbGV2ZWwuXG4gKlxuICogSW4gdGhlIGZvbGxvd2luZyBleGFtcGxlLCAnTWFpbkNoaWxkJyBhbmQgJ0F1eENoaWxkJyBhcmUgc2libGluZ3MuXG4gKiBXaGVuIG5hdmlnYXRpbmcgdG8gJ3BhcmVudC8xMC8oYS8vYXV4OmIpJywgdGhlIHJvdXRlIGluc3RhbnRpYXRlc1xuICogdGhlIG1haW4gY2hpbGQgYW5kIGF1eCBjaGlsZCBjb21wb25lbnRzIG5leHQgdG8gZWFjaCBvdGhlci5cbiAqIEZvciB0aGlzIHRvIHdvcmssIHRoZSBhcHBsaWNhdGlvbiBjb21wb25lbnQgbXVzdCBoYXZlIHRoZSBwcmltYXJ5IGFuZCBhdXggb3V0bGV0cyBkZWZpbmVkLlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgIHBhdGg6ICdwYXJlbnQvOmlkJyxcbiAqICAgIGNoaWxkcmVuOiBbXG4gKiAgICAgIHsgcGF0aDogJ2EnLCBjb21wb25lbnQ6IE1haW5DaGlsZCB9LFxuICogICAgICB7IHBhdGg6ICdiJywgY29tcG9uZW50OiBBdXhDaGlsZCwgb3V0bGV0OiAnYXV4JyB9XG4gKiAgICBdXG4gKiB9XVxuICogYGBgXG4gKlxuICogVGhlIHJvdXRlciBtZXJnZXMgdGhlIHBhcmFtZXRlcnMsIGRhdGEsIGFuZCByZXNvbHZlIG9mIHRoZSBjb21wb25lbnRsZXNzXG4gKiBwYXJlbnQgaW50byB0aGUgcGFyYW1ldGVycywgZGF0YSwgYW5kIHJlc29sdmUgb2YgdGhlIGNoaWxkcmVuLlxuICpcbiAqIFRoaXMgaXMgZXNwZWNpYWxseSB1c2VmdWwgd2hlbiBjaGlsZCBjb21wb25lbnRzIGFyZSBkZWZpbmVkXG4gKiB3aXRoIGFuIGVtcHR5IHBhdGggc3RyaW5nLCBhcyBpbiB0aGUgZm9sbG93aW5nIGV4YW1wbGUuXG4gKiBXaXRoIHRoaXMgY29uZmlndXJhdGlvbiwgbmF2aWdhdGluZyB0byAnL3BhcmVudC8xMCcgY3JlYXRlc1xuICogdGhlIG1haW4gY2hpbGQgYW5kIGF1eCBjb21wb25lbnRzLlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgIHBhdGg6ICdwYXJlbnQvOmlkJyxcbiAqICAgIGNoaWxkcmVuOiBbXG4gKiAgICAgIHsgcGF0aDogJycsIGNvbXBvbmVudDogTWFpbkNoaWxkIH0sXG4gKiAgICAgIHsgcGF0aDogJycsIGNvbXBvbmVudDogQXV4Q2hpbGQsIG91dGxldDogJ2F1eCcgfVxuICogICAgXVxuICogfV1cbiAqIGBgYFxuICpcbiAqICMjIyBMYXp5IExvYWRpbmdcbiAqXG4gKiBMYXp5IGxvYWRpbmcgc3BlZWRzIHVwIGFwcGxpY2F0aW9uIGxvYWQgdGltZSBieSBzcGxpdHRpbmcgdGhlIGFwcGxpY2F0aW9uXG4gKiBpbnRvIG11bHRpcGxlIGJ1bmRsZXMgYW5kIGxvYWRpbmcgdGhlbSBvbiBkZW1hbmQuXG4gKiBUbyB1c2UgbGF6eSBsb2FkaW5nLCBwcm92aWRlIHRoZSBgbG9hZENoaWxkcmVuYCBwcm9wZXJ0eSBpbiB0aGUgYFJvdXRlYCBvYmplY3QsXG4gKiBpbnN0ZWFkIG9mIHRoZSBgY2hpbGRyZW5gIHByb3BlcnR5LlxuICpcbiAqIEdpdmVuIHRoZSBmb2xsb3dpbmcgZXhhbXBsZSByb3V0ZSwgdGhlIHJvdXRlciB3aWxsIGxhenkgbG9hZFxuICogdGhlIGFzc29jaWF0ZWQgbW9kdWxlIG9uIGRlbWFuZCB1c2luZyB0aGUgYnJvd3NlciBuYXRpdmUgaW1wb3J0IHN5c3RlbS5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICdsYXp5JyxcbiAqICAgbG9hZENoaWxkcmVuOiAoKSA9PiBpbXBvcnQoJy4vbGF6eS1yb3V0ZS9sYXp5Lm1vZHVsZScpLnRoZW4obW9kID0+IG1vZC5MYXp5TW9kdWxlKSxcbiAqIH1dO1xuICogYGBgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJvdXRlIHtcbiAgLyoqXG4gICAqIFVzZWQgdG8gZGVmaW5lIGEgcGFnZSB0aXRsZSBmb3IgdGhlIHJvdXRlLiBUaGlzIGNhbiBiZSBhIHN0YXRpYyBzdHJpbmcgb3IgYW4gYEluamVjdGFibGVgIHRoYXRcbiAgICogaW1wbGVtZW50cyBgUmVzb2x2ZWAuXG4gICAqXG4gICAqIEBzZWUgYFBhZ2VUaXRsZVN0cmF0ZWd5YFxuICAgKi9cbiAgdGl0bGU/OiBzdHJpbmd8VHlwZTxSZXNvbHZlPHN0cmluZz4+O1xuXG4gIC8qKlxuICAgKiBUaGUgcGF0aCB0byBtYXRjaCBhZ2FpbnN0LiBDYW5ub3QgYmUgdXNlZCB0b2dldGhlciB3aXRoIGEgY3VzdG9tIGBtYXRjaGVyYCBmdW5jdGlvbi5cbiAgICogQSBVUkwgc3RyaW5nIHRoYXQgdXNlcyByb3V0ZXIgbWF0Y2hpbmcgbm90YXRpb24uXG4gICAqIENhbiBiZSBhIHdpbGQgY2FyZCAoYCoqYCkgdGhhdCBtYXRjaGVzIGFueSBVUkwgKHNlZSBVc2FnZSBOb3RlcyBiZWxvdykuXG4gICAqIERlZmF1bHQgaXMgXCIvXCIgKHRoZSByb290IHBhdGgpLlxuICAgKlxuICAgKi9cbiAgcGF0aD86IHN0cmluZztcbiAgLyoqXG4gICAqIFRoZSBwYXRoLW1hdGNoaW5nIHN0cmF0ZWd5LCBvbmUgb2YgJ3ByZWZpeCcgb3IgJ2Z1bGwnLlxuICAgKiBEZWZhdWx0IGlzICdwcmVmaXgnLlxuICAgKlxuICAgKiBCeSBkZWZhdWx0LCB0aGUgcm91dGVyIGNoZWNrcyBVUkwgZWxlbWVudHMgZnJvbSB0aGUgbGVmdCB0byBzZWUgaWYgdGhlIFVSTFxuICAgKiBtYXRjaGVzIGEgZ2l2ZW4gcGF0aCBhbmQgc3RvcHMgd2hlbiB0aGVyZSBpcyBhIGNvbmZpZyBtYXRjaC4gSW1wb3J0YW50bHkgdGhlcmUgbXVzdCBzdGlsbCBiZSBhXG4gICAqIGNvbmZpZyBtYXRjaCBmb3IgZWFjaCBzZWdtZW50IG9mIHRoZSBVUkwuIEZvciBleGFtcGxlLCAnL3RlYW0vMTEvdXNlcicgbWF0Y2hlcyB0aGUgcHJlZml4XG4gICAqICd0ZWFtLzppZCcgaWYgb25lIG9mIHRoZSByb3V0ZSdzIGNoaWxkcmVuIG1hdGNoZXMgdGhlIHNlZ21lbnQgJ3VzZXInLiBUaGF0IGlzLCB0aGUgVVJMXG4gICAqICcvdGVhbS8xMS91c2VyJyBtYXRjaGVzIHRoZSBjb25maWdcbiAgICogYHtwYXRoOiAndGVhbS86aWQnLCBjaGlsZHJlbjogW3twYXRoOiAnOnVzZXInLCBjb21wb25lbnQ6IFVzZXJ9XX1gXG4gICAqIGJ1dCBkb2VzIG5vdCBtYXRjaCB3aGVuIHRoZXJlIGFyZSBubyBjaGlsZHJlbiBhcyBpbiBge3BhdGg6ICd0ZWFtLzppZCcsIGNvbXBvbmVudDogVGVhbX1gLlxuICAgKlxuICAgKiBUaGUgcGF0aC1tYXRjaCBzdHJhdGVneSAnZnVsbCcgbWF0Y2hlcyBhZ2FpbnN0IHRoZSBlbnRpcmUgVVJMLlxuICAgKiBJdCBpcyBpbXBvcnRhbnQgdG8gZG8gdGhpcyB3aGVuIHJlZGlyZWN0aW5nIGVtcHR5LXBhdGggcm91dGVzLlxuICAgKiBPdGhlcndpc2UsIGJlY2F1c2UgYW4gZW1wdHkgcGF0aCBpcyBhIHByZWZpeCBvZiBhbnkgVVJMLFxuICAgKiB0aGUgcm91dGVyIHdvdWxkIGFwcGx5IHRoZSByZWRpcmVjdCBldmVuIHdoZW4gbmF2aWdhdGluZ1xuICAgKiB0byB0aGUgcmVkaXJlY3QgZGVzdGluYXRpb24sIGNyZWF0aW5nIGFuIGVuZGxlc3MgbG9vcC5cbiAgICpcbiAgICovXG4gIHBhdGhNYXRjaD86ICdwcmVmaXgnfCdmdWxsJztcbiAgLyoqXG4gICAqIEEgY3VzdG9tIFVSTC1tYXRjaGluZyBmdW5jdGlvbi4gQ2Fubm90IGJlIHVzZWQgdG9nZXRoZXIgd2l0aCBgcGF0aGAuXG4gICAqL1xuICBtYXRjaGVyPzogVXJsTWF0Y2hlcjtcbiAgLyoqXG4gICAqIFRoZSBjb21wb25lbnQgdG8gaW5zdGFudGlhdGUgd2hlbiB0aGUgcGF0aCBtYXRjaGVzLlxuICAgKiBDYW4gYmUgZW1wdHkgaWYgY2hpbGQgcm91dGVzIHNwZWNpZnkgY29tcG9uZW50cy5cbiAgICovXG4gIGNvbXBvbmVudD86IFR5cGU8YW55PjtcbiAgLyoqXG4gICAqIEEgVVJMIHRvIHJlZGlyZWN0IHRvIHdoZW4gdGhlIHBhdGggbWF0Y2hlcy5cbiAgICpcbiAgICogQWJzb2x1dGUgaWYgdGhlIFVSTCBiZWdpbnMgd2l0aCBhIHNsYXNoICgvKSwgb3RoZXJ3aXNlIHJlbGF0aXZlIHRvIHRoZSBwYXRoIFVSTC5cbiAgICogTm90ZSB0aGF0IG5vIGZ1cnRoZXIgcmVkaXJlY3RzIGFyZSBldmFsdWF0ZWQgYWZ0ZXIgYW4gYWJzb2x1dGUgcmVkaXJlY3QuXG4gICAqXG4gICAqIFdoZW4gbm90IHByZXNlbnQsIHJvdXRlciBkb2VzIG5vdCByZWRpcmVjdC5cbiAgICovXG4gIHJlZGlyZWN0VG8/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBOYW1lIG9mIGEgYFJvdXRlck91dGxldGAgb2JqZWN0IHdoZXJlIHRoZSBjb21wb25lbnQgY2FuIGJlIHBsYWNlZFxuICAgKiB3aGVuIHRoZSBwYXRoIG1hdGNoZXMuXG4gICAqL1xuICBvdXRsZXQ/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBBbiBhcnJheSBvZiBkZXBlbmRlbmN5LWluamVjdGlvbiB0b2tlbnMgdXNlZCB0byBsb29rIHVwIGBDYW5BY3RpdmF0ZSgpYFxuICAgKiBoYW5kbGVycywgaW4gb3JkZXIgdG8gZGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IHVzZXIgaXMgYWxsb3dlZCB0b1xuICAgKiBhY3RpdmF0ZSB0aGUgY29tcG9uZW50LiBCeSBkZWZhdWx0LCBhbnkgdXNlciBjYW4gYWN0aXZhdGUuXG4gICAqL1xuICBjYW5BY3RpdmF0ZT86IGFueVtdO1xuICAvKipcbiAgICogQW4gYXJyYXkgb2YgREkgdG9rZW5zIHVzZWQgdG8gbG9vayB1cCBgQ2FuQWN0aXZhdGVDaGlsZCgpYCBoYW5kbGVycyxcbiAgICogaW4gb3JkZXIgdG8gZGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IHVzZXIgaXMgYWxsb3dlZCB0byBhY3RpdmF0ZVxuICAgKiBhIGNoaWxkIG9mIHRoZSBjb21wb25lbnQuIEJ5IGRlZmF1bHQsIGFueSB1c2VyIGNhbiBhY3RpdmF0ZSBhIGNoaWxkLlxuICAgKi9cbiAgY2FuQWN0aXZhdGVDaGlsZD86IGFueVtdO1xuICAvKipcbiAgICogQW4gYXJyYXkgb2YgREkgdG9rZW5zIHVzZWQgdG8gbG9vayB1cCBgQ2FuRGVhY3RpdmF0ZSgpYFxuICAgKiBoYW5kbGVycywgaW4gb3JkZXIgdG8gZGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IHVzZXIgaXMgYWxsb3dlZCB0b1xuICAgKiBkZWFjdGl2YXRlIHRoZSBjb21wb25lbnQuIEJ5IGRlZmF1bHQsIGFueSB1c2VyIGNhbiBkZWFjdGl2YXRlLlxuICAgKlxuICAgKi9cbiAgY2FuRGVhY3RpdmF0ZT86IGFueVtdO1xuICAvKipcbiAgICogQW4gYXJyYXkgb2YgREkgdG9rZW5zIHVzZWQgdG8gbG9vayB1cCBgQ2FuTG9hZCgpYFxuICAgKiBoYW5kbGVycywgaW4gb3JkZXIgdG8gZGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IHVzZXIgaXMgYWxsb3dlZCB0b1xuICAgKiBsb2FkIHRoZSBjb21wb25lbnQuIEJ5IGRlZmF1bHQsIGFueSB1c2VyIGNhbiBsb2FkLlxuICAgKi9cbiAgY2FuTG9hZD86IGFueVtdO1xuICAvKipcbiAgICogQWRkaXRpb25hbCBkZXZlbG9wZXItZGVmaW5lZCBkYXRhIHByb3ZpZGVkIHRvIHRoZSBjb21wb25lbnQgdmlhXG4gICAqIGBBY3RpdmF0ZWRSb3V0ZWAuIEJ5IGRlZmF1bHQsIG5vIGFkZGl0aW9uYWwgZGF0YSBpcyBwYXNzZWQuXG4gICAqL1xuICBkYXRhPzogRGF0YTtcbiAgLyoqXG4gICAqIEEgbWFwIG9mIERJIHRva2VucyB1c2VkIHRvIGxvb2sgdXAgZGF0YSByZXNvbHZlcnMuIFNlZSBgUmVzb2x2ZWAuXG4gICAqL1xuICByZXNvbHZlPzogUmVzb2x2ZURhdGE7XG4gIC8qKlxuICAgKiBBbiBhcnJheSBvZiBjaGlsZCBgUm91dGVgIG9iamVjdHMgdGhhdCBzcGVjaWZpZXMgYSBuZXN0ZWQgcm91dGVcbiAgICogY29uZmlndXJhdGlvbi5cbiAgICovXG4gIGNoaWxkcmVuPzogUm91dGVzO1xuICAvKipcbiAgICogQW4gb2JqZWN0IHNwZWNpZnlpbmcgbGF6eS1sb2FkZWQgY2hpbGQgcm91dGVzLlxuICAgKi9cbiAgbG9hZENoaWxkcmVuPzogTG9hZENoaWxkcmVuO1xuICAvKipcbiAgICogRGVmaW5lcyB3aGVuIGd1YXJkcyBhbmQgcmVzb2x2ZXJzIHdpbGwgYmUgcnVuLiBPbmUgb2ZcbiAgICogLSBgcGFyYW1zT3JRdWVyeVBhcmFtc0NoYW5nZWAgOiBSdW4gd2hlbiBxdWVyeSBwYXJhbWV0ZXJzIGNoYW5nZS5cbiAgICogLSBgYWx3YXlzYCA6IFJ1biBvbiBldmVyeSBleGVjdXRpb24uXG4gICAqIEJ5IGRlZmF1bHQsIGd1YXJkcyBhbmQgcmVzb2x2ZXJzIHJ1biBvbmx5IHdoZW4gdGhlIG1hdHJpeFxuICAgKiBwYXJhbWV0ZXJzIG9mIHRoZSByb3V0ZSBjaGFuZ2UuXG4gICAqL1xuICBydW5HdWFyZHNBbmRSZXNvbHZlcnM/OiBSdW5HdWFyZHNBbmRSZXNvbHZlcnM7XG5cbiAgLyoqXG4gICAqIEEgYFByb3ZpZGVyYCBhcnJheSB0byB1c2UgZm9yIHRoaXMgYFJvdXRlYCBhbmQgaXRzIGBjaGlsZHJlbmAuXG4gICAqXG4gICAqIFRoZSBgUm91dGVyYCB3aWxsIGNyZWF0ZSBhIG5ldyBgRW52aXJvbm1lbnRJbmplY3RvcmAgZm9yIHRoaXNcbiAgICogYFJvdXRlYCBhbmQgdXNlIGl0IGZvciB0aGlzIGBSb3V0ZWAgYW5kIGl0cyBgY2hpbGRyZW5gLiBJZiB0aGlzXG4gICAqIHJvdXRlIGFsc28gaGFzIGEgYGxvYWRDaGlsZHJlbmAgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhbiBgTmdNb2R1bGVSZWZgLCB0aGlzIGluamVjdG9yIHdpbGwgYmVcbiAgICogdXNlZCBhcyB0aGUgcGFyZW50IG9mIHRoZSBsYXp5IGxvYWRlZCBtb2R1bGUuXG4gICAqL1xuICBwcm92aWRlcnM/OiBQcm92aWRlcltdO1xuXG4gIC8qKlxuICAgKiBJbmplY3RvciBjcmVhdGVkIGZyb20gdGhlIHN0YXRpYyByb3V0ZSBwcm92aWRlcnNcbiAgICogQGludGVybmFsXG4gICAqL1xuICBfaW5qZWN0b3I/OiBFbnZpcm9ubWVudEluamVjdG9yO1xuXG4gIC8qKlxuICAgKiBGaWxsZWQgZm9yIHJvdXRlcyB3aXRoIGBsb2FkQ2hpbGRyZW5gIG9uY2UgdGhlIHJvdXRlcyBhcmUgbG9hZGVkLlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIF9sb2FkZWRSb3V0ZXM/OiBSb3V0ZVtdO1xuXG4gIC8qKlxuICAgKiBGaWxsZWQgZm9yIHJvdXRlcyB3aXRoIGBsb2FkQ2hpbGRyZW5gIG9uY2UgdGhlIHJvdXRlcyBhcmUgbG9hZGVkXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgX2xvYWRlZEluamVjdG9yPzogRW52aXJvbm1lbnRJbmplY3Rvcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMb2FkZWRSb3V0ZXJDb25maWcge1xuICByb3V0ZXM6IFJvdXRlW107XG4gIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yfHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBJbnRlcmZhY2UgdGhhdCBhIGNsYXNzIGNhbiBpbXBsZW1lbnQgdG8gYmUgYSBndWFyZCBkZWNpZGluZyBpZiBhIHJvdXRlIGNhbiBiZSBhY3RpdmF0ZWQuXG4gKiBJZiBhbGwgZ3VhcmRzIHJldHVybiBgdHJ1ZWAsIG5hdmlnYXRpb24gY29udGludWVzLiBJZiBhbnkgZ3VhcmQgcmV0dXJucyBgZmFsc2VgLFxuICogbmF2aWdhdGlvbiBpcyBjYW5jZWxsZWQuIElmIGFueSBndWFyZCByZXR1cm5zIGEgYFVybFRyZWVgLCB0aGUgY3VycmVudCBuYXZpZ2F0aW9uXG4gKiBpcyBjYW5jZWxsZWQgYW5kIGEgbmV3IG5hdmlnYXRpb24gYmVnaW5zIHRvIHRoZSBgVXJsVHJlZWAgcmV0dXJuZWQgZnJvbSB0aGUgZ3VhcmQuXG4gKlxuICogVGhlIGZvbGxvd2luZyBleGFtcGxlIGltcGxlbWVudHMgYSBgQ2FuQWN0aXZhdGVgIGZ1bmN0aW9uIHRoYXQgY2hlY2tzIHdoZXRoZXIgdGhlXG4gKiBjdXJyZW50IHVzZXIgaGFzIHBlcm1pc3Npb24gdG8gYWN0aXZhdGUgdGhlIHJlcXVlc3RlZCByb3V0ZS5cbiAqXG4gKiBgYGBcbiAqIGNsYXNzIFVzZXJUb2tlbiB7fVxuICogY2xhc3MgUGVybWlzc2lvbnMge1xuICogICBjYW5BY3RpdmF0ZSh1c2VyOiBVc2VyVG9rZW4sIGlkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAqICAgICByZXR1cm4gdHJ1ZTtcbiAqICAgfVxuICogfVxuICpcbiAqIEBJbmplY3RhYmxlKClcbiAqIGNsYXNzIENhbkFjdGl2YXRlVGVhbSBpbXBsZW1lbnRzIENhbkFjdGl2YXRlIHtcbiAqICAgY29uc3RydWN0b3IocHJpdmF0ZSBwZXJtaXNzaW9uczogUGVybWlzc2lvbnMsIHByaXZhdGUgY3VycmVudFVzZXI6IFVzZXJUb2tlbikge31cbiAqXG4gKiAgIGNhbkFjdGl2YXRlKFxuICogICAgIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LFxuICogICAgIHN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90XG4gKiAgICk6IE9ic2VydmFibGU8Ym9vbGVhbnxVcmxUcmVlPnxQcm9taXNlPGJvb2xlYW58VXJsVHJlZT58Ym9vbGVhbnxVcmxUcmVlIHtcbiAqICAgICByZXR1cm4gdGhpcy5wZXJtaXNzaW9ucy5jYW5BY3RpdmF0ZSh0aGlzLmN1cnJlbnRVc2VyLCByb3V0ZS5wYXJhbXMuaWQpO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBIZXJlLCB0aGUgZGVmaW5lZCBndWFyZCBmdW5jdGlvbiBpcyBwcm92aWRlZCBhcyBwYXJ0IG9mIHRoZSBgUm91dGVgIG9iamVjdFxuICogaW4gdGhlIHJvdXRlciBjb25maWd1cmF0aW9uOlxuICpcbiAqIGBgYFxuICogQE5nTW9kdWxlKHtcbiAqICAgaW1wb3J0czogW1xuICogICAgIFJvdXRlck1vZHVsZS5mb3JSb290KFtcbiAqICAgICAgIHtcbiAqICAgICAgICAgcGF0aDogJ3RlYW0vOmlkJyxcbiAqICAgICAgICAgY29tcG9uZW50OiBUZWFtQ29tcG9uZW50LFxuICogICAgICAgICBjYW5BY3RpdmF0ZTogW0NhbkFjdGl2YXRlVGVhbV1cbiAqICAgICAgIH1cbiAqICAgICBdKVxuICogICBdLFxuICogICBwcm92aWRlcnM6IFtDYW5BY3RpdmF0ZVRlYW0sIFVzZXJUb2tlbiwgUGVybWlzc2lvbnNdXG4gKiB9KVxuICogY2xhc3MgQXBwTW9kdWxlIHt9XG4gKiBgYGBcbiAqXG4gKiBZb3UgY2FuIGFsdGVybmF0aXZlbHkgcHJvdmlkZSBhbiBpbi1saW5lIGZ1bmN0aW9uIHdpdGggdGhlIGBjYW5BY3RpdmF0ZWAgc2lnbmF0dXJlOlxuICpcbiAqIGBgYFxuICogQE5nTW9kdWxlKHtcbiAqICAgaW1wb3J0czogW1xuICogICAgIFJvdXRlck1vZHVsZS5mb3JSb290KFtcbiAqICAgICAgIHtcbiAqICAgICAgICAgcGF0aDogJ3RlYW0vOmlkJyxcbiAqICAgICAgICAgY29tcG9uZW50OiBUZWFtQ29tcG9uZW50LFxuICogICAgICAgICBjYW5BY3RpdmF0ZTogWydjYW5BY3RpdmF0ZVRlYW0nXVxuICogICAgICAgfVxuICogICAgIF0pXG4gKiAgIF0sXG4gKiAgIHByb3ZpZGVyczogW1xuICogICAgIHtcbiAqICAgICAgIHByb3ZpZGU6ICdjYW5BY3RpdmF0ZVRlYW0nLFxuICogICAgICAgdXNlVmFsdWU6IChyb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgc3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QpID0+IHRydWVcbiAqICAgICB9XG4gKiAgIF1cbiAqIH0pXG4gKiBjbGFzcyBBcHBNb2R1bGUge31cbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDYW5BY3RpdmF0ZSB7XG4gIGNhbkFjdGl2YXRlKHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCk6XG4gICAgICBPYnNlcnZhYmxlPGJvb2xlYW58VXJsVHJlZT58UHJvbWlzZTxib29sZWFufFVybFRyZWU+fGJvb2xlYW58VXJsVHJlZTtcbn1cblxuZXhwb3J0IHR5cGUgQ2FuQWN0aXZhdGVGbiA9IChyb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgc3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QpID0+XG4gICAgT2JzZXJ2YWJsZTxib29sZWFufFVybFRyZWU+fFByb21pc2U8Ym9vbGVhbnxVcmxUcmVlPnxib29sZWFufFVybFRyZWU7XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogSW50ZXJmYWNlIHRoYXQgYSBjbGFzcyBjYW4gaW1wbGVtZW50IHRvIGJlIGEgZ3VhcmQgZGVjaWRpbmcgaWYgYSBjaGlsZCByb3V0ZSBjYW4gYmUgYWN0aXZhdGVkLlxuICogSWYgYWxsIGd1YXJkcyByZXR1cm4gYHRydWVgLCBuYXZpZ2F0aW9uIGNvbnRpbnVlcy4gSWYgYW55IGd1YXJkIHJldHVybnMgYGZhbHNlYCxcbiAqIG5hdmlnYXRpb24gaXMgY2FuY2VsbGVkLiBJZiBhbnkgZ3VhcmQgcmV0dXJucyBhIGBVcmxUcmVlYCwgY3VycmVudCBuYXZpZ2F0aW9uXG4gKiBpcyBjYW5jZWxsZWQgYW5kIGEgbmV3IG5hdmlnYXRpb24gYmVnaW5zIHRvIHRoZSBgVXJsVHJlZWAgcmV0dXJuZWQgZnJvbSB0aGUgZ3VhcmQuXG4gKlxuICogVGhlIGZvbGxvd2luZyBleGFtcGxlIGltcGxlbWVudHMgYSBgQ2FuQWN0aXZhdGVDaGlsZGAgZnVuY3Rpb24gdGhhdCBjaGVja3Mgd2hldGhlciB0aGVcbiAqIGN1cnJlbnQgdXNlciBoYXMgcGVybWlzc2lvbiB0byBhY3RpdmF0ZSB0aGUgcmVxdWVzdGVkIGNoaWxkIHJvdXRlLlxuICpcbiAqIGBgYFxuICogY2xhc3MgVXNlclRva2VuIHt9XG4gKiBjbGFzcyBQZXJtaXNzaW9ucyB7XG4gKiAgIGNhbkFjdGl2YXRlKHVzZXI6IFVzZXJUb2tlbiwgaWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICogICAgIHJldHVybiB0cnVlO1xuICogICB9XG4gKiB9XG4gKlxuICogQEluamVjdGFibGUoKVxuICogY2xhc3MgQ2FuQWN0aXZhdGVUZWFtIGltcGxlbWVudHMgQ2FuQWN0aXZhdGVDaGlsZCB7XG4gKiAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcGVybWlzc2lvbnM6IFBlcm1pc3Npb25zLCBwcml2YXRlIGN1cnJlbnRVc2VyOiBVc2VyVG9rZW4pIHt9XG4gKlxuICogICBjYW5BY3RpdmF0ZUNoaWxkKFxuICogICAgIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LFxuICogICAgIHN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90XG4gKiAgICk6IE9ic2VydmFibGU8Ym9vbGVhbnxVcmxUcmVlPnxQcm9taXNlPGJvb2xlYW58VXJsVHJlZT58Ym9vbGVhbnxVcmxUcmVlIHtcbiAqICAgICByZXR1cm4gdGhpcy5wZXJtaXNzaW9ucy5jYW5BY3RpdmF0ZSh0aGlzLmN1cnJlbnRVc2VyLCByb3V0ZS5wYXJhbXMuaWQpO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBIZXJlLCB0aGUgZGVmaW5lZCBndWFyZCBmdW5jdGlvbiBpcyBwcm92aWRlZCBhcyBwYXJ0IG9mIHRoZSBgUm91dGVgIG9iamVjdFxuICogaW4gdGhlIHJvdXRlciBjb25maWd1cmF0aW9uOlxuICpcbiAqIGBgYFxuICogQE5nTW9kdWxlKHtcbiAqICAgaW1wb3J0czogW1xuICogICAgIFJvdXRlck1vZHVsZS5mb3JSb290KFtcbiAqICAgICAgIHtcbiAqICAgICAgICAgcGF0aDogJ3Jvb3QnLFxuICogICAgICAgICBjYW5BY3RpdmF0ZUNoaWxkOiBbQ2FuQWN0aXZhdGVUZWFtXSxcbiAqICAgICAgICAgY2hpbGRyZW46IFtcbiAqICAgICAgICAgICB7XG4gKiAgICAgICAgICAgICAgcGF0aDogJ3RlYW0vOmlkJyxcbiAqICAgICAgICAgICAgICBjb21wb25lbnQ6IFRlYW1Db21wb25lbnRcbiAqICAgICAgICAgICB9XG4gKiAgICAgICAgIF1cbiAqICAgICAgIH1cbiAqICAgICBdKVxuICogICBdLFxuICogICBwcm92aWRlcnM6IFtDYW5BY3RpdmF0ZVRlYW0sIFVzZXJUb2tlbiwgUGVybWlzc2lvbnNdXG4gKiB9KVxuICogY2xhc3MgQXBwTW9kdWxlIHt9XG4gKiBgYGBcbiAqXG4gKiBZb3UgY2FuIGFsdGVybmF0aXZlbHkgcHJvdmlkZSBhbiBpbi1saW5lIGZ1bmN0aW9uIHdpdGggdGhlIGBjYW5BY3RpdmF0ZUNoaWxkYCBzaWduYXR1cmU6XG4gKlxuICogYGBgXG4gKiBATmdNb2R1bGUoe1xuICogICBpbXBvcnRzOiBbXG4gKiAgICAgUm91dGVyTW9kdWxlLmZvclJvb3QoW1xuICogICAgICAge1xuICogICAgICAgICBwYXRoOiAncm9vdCcsXG4gKiAgICAgICAgIGNhbkFjdGl2YXRlQ2hpbGQ6IFsnY2FuQWN0aXZhdGVUZWFtJ10sXG4gKiAgICAgICAgIGNoaWxkcmVuOiBbXG4gKiAgICAgICAgICAge1xuICogICAgICAgICAgICAgcGF0aDogJ3RlYW0vOmlkJyxcbiAqICAgICAgICAgICAgIGNvbXBvbmVudDogVGVhbUNvbXBvbmVudFxuICogICAgICAgICAgIH1cbiAqICAgICAgICAgXVxuICogICAgICAgfVxuICogICAgIF0pXG4gKiAgIF0sXG4gKiAgIHByb3ZpZGVyczogW1xuICogICAgIHtcbiAqICAgICAgIHByb3ZpZGU6ICdjYW5BY3RpdmF0ZVRlYW0nLFxuICogICAgICAgdXNlVmFsdWU6IChyb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgc3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QpID0+IHRydWVcbiAqICAgICB9XG4gKiAgIF1cbiAqIH0pXG4gKiBjbGFzcyBBcHBNb2R1bGUge31cbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDYW5BY3RpdmF0ZUNoaWxkIHtcbiAgY2FuQWN0aXZhdGVDaGlsZChjaGlsZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCk6XG4gICAgICBPYnNlcnZhYmxlPGJvb2xlYW58VXJsVHJlZT58UHJvbWlzZTxib29sZWFufFVybFRyZWU+fGJvb2xlYW58VXJsVHJlZTtcbn1cblxuZXhwb3J0IHR5cGUgQ2FuQWN0aXZhdGVDaGlsZEZuID0gKGNoaWxkUm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIHN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90KSA9PlxuICAgIE9ic2VydmFibGU8Ym9vbGVhbnxVcmxUcmVlPnxQcm9taXNlPGJvb2xlYW58VXJsVHJlZT58Ym9vbGVhbnxVcmxUcmVlO1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEludGVyZmFjZSB0aGF0IGEgY2xhc3MgY2FuIGltcGxlbWVudCB0byBiZSBhIGd1YXJkIGRlY2lkaW5nIGlmIGEgcm91dGUgY2FuIGJlIGRlYWN0aXZhdGVkLlxuICogSWYgYWxsIGd1YXJkcyByZXR1cm4gYHRydWVgLCBuYXZpZ2F0aW9uIGNvbnRpbnVlcy4gSWYgYW55IGd1YXJkIHJldHVybnMgYGZhbHNlYCxcbiAqIG5hdmlnYXRpb24gaXMgY2FuY2VsbGVkLiBJZiBhbnkgZ3VhcmQgcmV0dXJucyBhIGBVcmxUcmVlYCwgY3VycmVudCBuYXZpZ2F0aW9uXG4gKiBpcyBjYW5jZWxsZWQgYW5kIGEgbmV3IG5hdmlnYXRpb24gYmVnaW5zIHRvIHRoZSBgVXJsVHJlZWAgcmV0dXJuZWQgZnJvbSB0aGUgZ3VhcmQuXG4gKlxuICogVGhlIGZvbGxvd2luZyBleGFtcGxlIGltcGxlbWVudHMgYSBgQ2FuRGVhY3RpdmF0ZWAgZnVuY3Rpb24gdGhhdCBjaGVja3Mgd2hldGhlciB0aGVcbiAqIGN1cnJlbnQgdXNlciBoYXMgcGVybWlzc2lvbiB0byBkZWFjdGl2YXRlIHRoZSByZXF1ZXN0ZWQgcm91dGUuXG4gKlxuICogYGBgXG4gKiBjbGFzcyBVc2VyVG9rZW4ge31cbiAqIGNsYXNzIFBlcm1pc3Npb25zIHtcbiAqICAgY2FuRGVhY3RpdmF0ZSh1c2VyOiBVc2VyVG9rZW4sIGlkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAqICAgICByZXR1cm4gdHJ1ZTtcbiAqICAgfVxuICogfVxuICogYGBgXG4gKlxuICogSGVyZSwgdGhlIGRlZmluZWQgZ3VhcmQgZnVuY3Rpb24gaXMgcHJvdmlkZWQgYXMgcGFydCBvZiB0aGUgYFJvdXRlYCBvYmplY3RcbiAqIGluIHRoZSByb3V0ZXIgY29uZmlndXJhdGlvbjpcbiAqXG4gKiBgYGBcbiAqXG4gKiBASW5qZWN0YWJsZSgpXG4gKiBjbGFzcyBDYW5EZWFjdGl2YXRlVGVhbSBpbXBsZW1lbnRzIENhbkRlYWN0aXZhdGU8VGVhbUNvbXBvbmVudD4ge1xuICogICBjb25zdHJ1Y3Rvcihwcml2YXRlIHBlcm1pc3Npb25zOiBQZXJtaXNzaW9ucywgcHJpdmF0ZSBjdXJyZW50VXNlcjogVXNlclRva2VuKSB7fVxuICpcbiAqICAgY2FuRGVhY3RpdmF0ZShcbiAqICAgICBjb21wb25lbnQ6IFRlYW1Db21wb25lbnQsXG4gKiAgICAgY3VycmVudFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LFxuICogICAgIGN1cnJlbnRTdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCxcbiAqICAgICBuZXh0U3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3RcbiAqICAgKTogT2JzZXJ2YWJsZTxib29sZWFufFVybFRyZWU+fFByb21pc2U8Ym9vbGVhbnxVcmxUcmVlPnxib29sZWFufFVybFRyZWUge1xuICogICAgIHJldHVybiB0aGlzLnBlcm1pc3Npb25zLmNhbkRlYWN0aXZhdGUodGhpcy5jdXJyZW50VXNlciwgcm91dGUucGFyYW1zLmlkKTtcbiAqICAgfVxuICogfVxuICpcbiAqIEBOZ01vZHVsZSh7XG4gKiAgIGltcG9ydHM6IFtcbiAqICAgICBSb3V0ZXJNb2R1bGUuZm9yUm9vdChbXG4gKiAgICAgICB7XG4gKiAgICAgICAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gKiAgICAgICAgIGNvbXBvbmVudDogVGVhbUNvbXBvbmVudCxcbiAqICAgICAgICAgY2FuRGVhY3RpdmF0ZTogW0NhbkRlYWN0aXZhdGVUZWFtXVxuICogICAgICAgfVxuICogICAgIF0pXG4gKiAgIF0sXG4gKiAgIHByb3ZpZGVyczogW0NhbkRlYWN0aXZhdGVUZWFtLCBVc2VyVG9rZW4sIFBlcm1pc3Npb25zXVxuICogfSlcbiAqIGNsYXNzIEFwcE1vZHVsZSB7fVxuICogYGBgXG4gKlxuICogWW91IGNhbiBhbHRlcm5hdGl2ZWx5IHByb3ZpZGUgYW4gaW4tbGluZSBmdW5jdGlvbiB3aXRoIHRoZSBgY2FuRGVhY3RpdmF0ZWAgc2lnbmF0dXJlOlxuICpcbiAqIGBgYFxuICogQE5nTW9kdWxlKHtcbiAqICAgaW1wb3J0czogW1xuICogICAgIFJvdXRlck1vZHVsZS5mb3JSb290KFtcbiAqICAgICAgIHtcbiAqICAgICAgICAgcGF0aDogJ3RlYW0vOmlkJyxcbiAqICAgICAgICAgY29tcG9uZW50OiBUZWFtQ29tcG9uZW50LFxuICogICAgICAgICBjYW5EZWFjdGl2YXRlOiBbJ2NhbkRlYWN0aXZhdGVUZWFtJ11cbiAqICAgICAgIH1cbiAqICAgICBdKVxuICogICBdLFxuICogICBwcm92aWRlcnM6IFtcbiAqICAgICB7XG4gKiAgICAgICBwcm92aWRlOiAnY2FuRGVhY3RpdmF0ZVRlYW0nLFxuICogICAgICAgdXNlVmFsdWU6IChjb21wb25lbnQ6IFRlYW1Db21wb25lbnQsIGN1cnJlbnRSb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgY3VycmVudFN0YXRlOlxuICogUm91dGVyU3RhdGVTbmFwc2hvdCwgbmV4dFN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90KSA9PiB0cnVlXG4gKiAgICAgfVxuICogICBdXG4gKiB9KVxuICogY2xhc3MgQXBwTW9kdWxlIHt9XG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuRGVhY3RpdmF0ZTxUPiB7XG4gIGNhbkRlYWN0aXZhdGUoXG4gICAgICBjb21wb25lbnQ6IFQsIGN1cnJlbnRSb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgY3VycmVudFN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90LFxuICAgICAgbmV4dFN0YXRlPzogUm91dGVyU3RhdGVTbmFwc2hvdCk6IE9ic2VydmFibGU8Ym9vbGVhbnxVcmxUcmVlPnxQcm9taXNlPGJvb2xlYW58VXJsVHJlZT58Ym9vbGVhblxuICAgICAgfFVybFRyZWU7XG59XG5cbmV4cG9ydCB0eXBlIENhbkRlYWN0aXZhdGVGbjxUPiA9XG4gICAgKGNvbXBvbmVudDogVCwgY3VycmVudFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBjdXJyZW50U3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QsXG4gICAgIG5leHRTdGF0ZT86IFJvdXRlclN0YXRlU25hcHNob3QpID0+XG4gICAgICAgIE9ic2VydmFibGU8Ym9vbGVhbnxVcmxUcmVlPnxQcm9taXNlPGJvb2xlYW58VXJsVHJlZT58Ym9vbGVhbnxVcmxUcmVlO1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEludGVyZmFjZSB0aGF0IGNsYXNzZXMgY2FuIGltcGxlbWVudCB0byBiZSBhIGRhdGEgcHJvdmlkZXIuXG4gKiBBIGRhdGEgcHJvdmlkZXIgY2xhc3MgY2FuIGJlIHVzZWQgd2l0aCB0aGUgcm91dGVyIHRvIHJlc29sdmUgZGF0YSBkdXJpbmcgbmF2aWdhdGlvbi5cbiAqIFRoZSBpbnRlcmZhY2UgZGVmaW5lcyBhIGByZXNvbHZlKClgIG1ldGhvZCB0aGF0IGlzIGludm9rZWQgcmlnaHQgYWZ0ZXIgdGhlIGBSZXNvbHZlU3RhcnRgXG4gKiByb3V0ZXIgZXZlbnQuIFRoZSByb3V0ZXIgd2FpdHMgZm9yIHRoZSBkYXRhIHRvIGJlIHJlc29sdmVkIGJlZm9yZSB0aGUgcm91dGUgaXMgZmluYWxseSBhY3RpdmF0ZWQuXG4gKlxuICogVGhlIGZvbGxvd2luZyBleGFtcGxlIGltcGxlbWVudHMgYSBgcmVzb2x2ZSgpYCBtZXRob2QgdGhhdCByZXRyaWV2ZXMgdGhlIGRhdGFcbiAqIG5lZWRlZCB0byBhY3RpdmF0ZSB0aGUgcmVxdWVzdGVkIHJvdXRlLlxuICpcbiAqIGBgYFxuICogQEluamVjdGFibGUoeyBwcm92aWRlZEluOiAncm9vdCcgfSlcbiAqIGV4cG9ydCBjbGFzcyBIZXJvUmVzb2x2ZXIgaW1wbGVtZW50cyBSZXNvbHZlPEhlcm8+IHtcbiAqICAgY29uc3RydWN0b3IocHJpdmF0ZSBzZXJ2aWNlOiBIZXJvU2VydmljZSkge31cbiAqXG4gKiAgIHJlc29sdmUoXG4gKiAgICAgcm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsXG4gKiAgICAgc3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3RcbiAqICAgKTogT2JzZXJ2YWJsZTxIZXJvPnxQcm9taXNlPEhlcm8+fEhlcm8ge1xuICogICAgIHJldHVybiB0aGlzLnNlcnZpY2UuZ2V0SGVybyhyb3V0ZS5wYXJhbU1hcC5nZXQoJ2lkJykpO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBIZXJlLCB0aGUgZGVmaW5lZCBgcmVzb2x2ZSgpYCBmdW5jdGlvbiBpcyBwcm92aWRlZCBhcyBwYXJ0IG9mIHRoZSBgUm91dGVgIG9iamVjdFxuICogaW4gdGhlIHJvdXRlciBjb25maWd1cmF0aW9uOlxuICpcbiAqIGBgYFxuXG4gKiBATmdNb2R1bGUoe1xuICogICBpbXBvcnRzOiBbXG4gKiAgICAgUm91dGVyTW9kdWxlLmZvclJvb3QoW1xuICogICAgICAge1xuICogICAgICAgICBwYXRoOiAnZGV0YWlsLzppZCcsXG4gKiAgICAgICAgIGNvbXBvbmVudDogSGVyb0RldGFpbENvbXBvbmVudCxcbiAqICAgICAgICAgcmVzb2x2ZToge1xuICogICAgICAgICAgIGhlcm86IEhlcm9SZXNvbHZlclxuICogICAgICAgICB9XG4gKiAgICAgICB9XG4gKiAgICAgXSlcbiAqICAgXSxcbiAqICAgZXhwb3J0czogW1JvdXRlck1vZHVsZV1cbiAqIH0pXG4gKiBleHBvcnQgY2xhc3MgQXBwUm91dGluZ01vZHVsZSB7fVxuICogYGBgXG4gKlxuICogWW91IGNhbiBhbHRlcm5hdGl2ZWx5IHByb3ZpZGUgYW4gaW4tbGluZSBmdW5jdGlvbiB3aXRoIHRoZSBgcmVzb2x2ZSgpYCBzaWduYXR1cmU6XG4gKlxuICogYGBgXG4gKiBleHBvcnQgY29uc3QgbXlIZXJvOiBIZXJvID0ge1xuICogICAvLyAuLi5cbiAqIH1cbiAqXG4gKiBATmdNb2R1bGUoe1xuICogICBpbXBvcnRzOiBbXG4gKiAgICAgUm91dGVyTW9kdWxlLmZvclJvb3QoW1xuICogICAgICAge1xuICogICAgICAgICBwYXRoOiAnZGV0YWlsLzppZCcsXG4gKiAgICAgICAgIGNvbXBvbmVudDogSGVyb0NvbXBvbmVudCxcbiAqICAgICAgICAgcmVzb2x2ZToge1xuICogICAgICAgICAgIGhlcm86ICdoZXJvUmVzb2x2ZXInXG4gKiAgICAgICAgIH1cbiAqICAgICAgIH1cbiAqICAgICBdKVxuICogICBdLFxuICogICBwcm92aWRlcnM6IFtcbiAqICAgICB7XG4gKiAgICAgICBwcm92aWRlOiAnaGVyb1Jlc29sdmVyJyxcbiAqICAgICAgIHVzZVZhbHVlOiAocm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIHN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90KSA9PiBteUhlcm9cbiAqICAgICB9XG4gKiAgIF1cbiAqIH0pXG4gKiBleHBvcnQgY2xhc3MgQXBwTW9kdWxlIHt9XG4gKiBgYGBcbiAqXG4gKiBBbmQgeW91IGNhbiBhY2Nlc3MgdG8geW91ciByZXNvbHZlZCBkYXRhIGZyb20gYEhlcm9Db21wb25lbnRgOlxuICpcbiAqIGBgYFxuICogQENvbXBvbmVudCh7XG4gKiAgc2VsZWN0b3I6IFwiYXBwLWhlcm9cIixcbiAqICB0ZW1wbGF0ZVVybDogXCJoZXJvLmNvbXBvbmVudC5odG1sXCIsXG4gKiB9KVxuICogZXhwb3J0IGNsYXNzIEhlcm9Db21wb25lbnQge1xuICpcbiAqICBjb25zdHJ1Y3Rvcihwcml2YXRlIGFjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSkge31cbiAqXG4gKiAgbmdPbkluaXQoKSB7XG4gKiAgICB0aGlzLmFjdGl2YXRlZFJvdXRlLmRhdGEuc3Vic2NyaWJlKCh7IGhlcm8gfSkgPT4ge1xuICogICAgICAvLyBkbyBzb21ldGhpbmcgd2l0aCB5b3VyIHJlc29sdmVkIGRhdGEgLi4uXG4gKiAgICB9KVxuICogIH1cbiAqXG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIFdoZW4gYm90aCBndWFyZCBhbmQgcmVzb2x2ZXJzIGFyZSBzcGVjaWZpZWQsIHRoZSByZXNvbHZlcnMgYXJlIG5vdCBleGVjdXRlZCB1bnRpbFxuICogYWxsIGd1YXJkcyBoYXZlIHJ1biBhbmQgc3VjY2VlZGVkLlxuICogRm9yIGV4YW1wbGUsIGNvbnNpZGVyIHRoZSBmb2xsb3dpbmcgcm91dGUgY29uZmlndXJhdGlvbjpcbiAqXG4gKiBgYGBcbiAqIHtcbiAqICBwYXRoOiAnYmFzZSdcbiAqICBjYW5BY3RpdmF0ZTogW0Jhc2VHdWFyZF0sXG4gKiAgcmVzb2x2ZToge2RhdGE6IEJhc2VEYXRhUmVzb2x2ZXJ9XG4gKiAgY2hpbGRyZW46IFtcbiAqICAge1xuICogICAgIHBhdGg6ICdjaGlsZCcsXG4gKiAgICAgZ3VhcmRzOiBbQ2hpbGRHdWFyZF0sXG4gKiAgICAgY29tcG9uZW50OiBDaGlsZENvbXBvbmVudCxcbiAqICAgICByZXNvbHZlOiB7Y2hpbGREYXRhOiBDaGlsZERhdGFSZXNvbHZlcn1cbiAqICAgIH1cbiAqICBdXG4gKiB9XG4gKiBgYGBcbiAqIFRoZSBvcmRlciBvZiBleGVjdXRpb24gaXM6IEJhc2VHdWFyZCwgQ2hpbGRHdWFyZCwgQmFzZURhdGFSZXNvbHZlciwgQ2hpbGREYXRhUmVzb2x2ZXIuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlc29sdmU8VD4ge1xuICByZXNvbHZlKHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCk6IE9ic2VydmFibGU8VD58UHJvbWlzZTxUPnxUO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEludGVyZmFjZSB0aGF0IGEgY2xhc3MgY2FuIGltcGxlbWVudCB0byBiZSBhIGd1YXJkIGRlY2lkaW5nIGlmIGNoaWxkcmVuIGNhbiBiZSBsb2FkZWQuXG4gKiBJZiBhbGwgZ3VhcmRzIHJldHVybiBgdHJ1ZWAsIG5hdmlnYXRpb24gY29udGludWVzLiBJZiBhbnkgZ3VhcmQgcmV0dXJucyBgZmFsc2VgLFxuICogbmF2aWdhdGlvbiBpcyBjYW5jZWxsZWQuIElmIGFueSBndWFyZCByZXR1cm5zIGEgYFVybFRyZWVgLCBjdXJyZW50IG5hdmlnYXRpb25cbiAqIGlzIGNhbmNlbGxlZCBhbmQgYSBuZXcgbmF2aWdhdGlvbiBzdGFydHMgdG8gdGhlIGBVcmxUcmVlYCByZXR1cm5lZCBmcm9tIHRoZSBndWFyZC5cbiAqXG4gKiBUaGUgZm9sbG93aW5nIGV4YW1wbGUgaW1wbGVtZW50cyBhIGBDYW5Mb2FkYCBmdW5jdGlvbiB0aGF0IGRlY2lkZXMgd2hldGhlciB0aGVcbiAqIGN1cnJlbnQgdXNlciBoYXMgcGVybWlzc2lvbiB0byBsb2FkIHJlcXVlc3RlZCBjaGlsZCByb3V0ZXMuXG4gKlxuICpcbiAqIGBgYFxuICogY2xhc3MgVXNlclRva2VuIHt9XG4gKiBjbGFzcyBQZXJtaXNzaW9ucyB7XG4gKiAgIGNhbkxvYWRDaGlsZHJlbih1c2VyOiBVc2VyVG9rZW4sIGlkOiBzdHJpbmcsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10pOiBib29sZWFuIHtcbiAqICAgICByZXR1cm4gdHJ1ZTtcbiAqICAgfVxuICogfVxuICpcbiAqIEBJbmplY3RhYmxlKClcbiAqIGNsYXNzIENhbkxvYWRUZWFtU2VjdGlvbiBpbXBsZW1lbnRzIENhbkxvYWQge1xuICogICBjb25zdHJ1Y3Rvcihwcml2YXRlIHBlcm1pc3Npb25zOiBQZXJtaXNzaW9ucywgcHJpdmF0ZSBjdXJyZW50VXNlcjogVXNlclRva2VuKSB7fVxuICpcbiAqICAgY2FuTG9hZChyb3V0ZTogUm91dGUsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10pOiBPYnNlcnZhYmxlPGJvb2xlYW4+fFByb21pc2U8Ym9vbGVhbj58Ym9vbGVhbiB7XG4gKiAgICAgcmV0dXJuIHRoaXMucGVybWlzc2lvbnMuY2FuTG9hZENoaWxkcmVuKHRoaXMuY3VycmVudFVzZXIsIHJvdXRlLCBzZWdtZW50cyk7XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIEhlcmUsIHRoZSBkZWZpbmVkIGd1YXJkIGZ1bmN0aW9uIGlzIHByb3ZpZGVkIGFzIHBhcnQgb2YgdGhlIGBSb3V0ZWAgb2JqZWN0XG4gKiBpbiB0aGUgcm91dGVyIGNvbmZpZ3VyYXRpb246XG4gKlxuICogYGBgXG4gKlxuICogQE5nTW9kdWxlKHtcbiAqICAgaW1wb3J0czogW1xuICogICAgIFJvdXRlck1vZHVsZS5mb3JSb290KFtcbiAqICAgICAgIHtcbiAqICAgICAgICAgcGF0aDogJ3RlYW0vOmlkJyxcbiAqICAgICAgICAgY29tcG9uZW50OiBUZWFtQ29tcG9uZW50LFxuICogICAgICAgICBsb2FkQ2hpbGRyZW46ICgpID0+IGltcG9ydCgnLi90ZWFtJykudGhlbihtb2QgPT4gbW9kLlRlYW1Nb2R1bGUpLFxuICogICAgICAgICBjYW5Mb2FkOiBbQ2FuTG9hZFRlYW1TZWN0aW9uXVxuICogICAgICAgfVxuICogICAgIF0pXG4gKiAgIF0sXG4gKiAgIHByb3ZpZGVyczogW0NhbkxvYWRUZWFtU2VjdGlvbiwgVXNlclRva2VuLCBQZXJtaXNzaW9uc11cbiAqIH0pXG4gKiBjbGFzcyBBcHBNb2R1bGUge31cbiAqIGBgYFxuICpcbiAqIFlvdSBjYW4gYWx0ZXJuYXRpdmVseSBwcm92aWRlIGFuIGluLWxpbmUgZnVuY3Rpb24gd2l0aCB0aGUgYGNhbkxvYWRgIHNpZ25hdHVyZTpcbiAqXG4gKiBgYGBcbiAqIEBOZ01vZHVsZSh7XG4gKiAgIGltcG9ydHM6IFtcbiAqICAgICBSb3V0ZXJNb2R1bGUuZm9yUm9vdChbXG4gKiAgICAgICB7XG4gKiAgICAgICAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gKiAgICAgICAgIGNvbXBvbmVudDogVGVhbUNvbXBvbmVudCxcbiAqICAgICAgICAgbG9hZENoaWxkcmVuOiAoKSA9PiBpbXBvcnQoJy4vdGVhbScpLnRoZW4obW9kID0+IG1vZC5UZWFtTW9kdWxlKSxcbiAqICAgICAgICAgY2FuTG9hZDogWydjYW5Mb2FkVGVhbVNlY3Rpb24nXVxuICogICAgICAgfVxuICogICAgIF0pXG4gKiAgIF0sXG4gKiAgIHByb3ZpZGVyczogW1xuICogICAgIHtcbiAqICAgICAgIHByb3ZpZGU6ICdjYW5Mb2FkVGVhbVNlY3Rpb24nLFxuICogICAgICAgdXNlVmFsdWU6IChyb3V0ZTogUm91dGUsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10pID0+IHRydWVcbiAqICAgICB9XG4gKiAgIF1cbiAqIH0pXG4gKiBjbGFzcyBBcHBNb2R1bGUge31cbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDYW5Mb2FkIHtcbiAgY2FuTG9hZChyb3V0ZTogUm91dGUsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10pOlxuICAgICAgT2JzZXJ2YWJsZTxib29sZWFufFVybFRyZWU+fFByb21pc2U8Ym9vbGVhbnxVcmxUcmVlPnxib29sZWFufFVybFRyZWU7XG59XG5cbmV4cG9ydCB0eXBlIENhbkxvYWRGbiA9IChyb3V0ZTogUm91dGUsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10pID0+XG4gICAgT2JzZXJ2YWJsZTxib29sZWFufFVybFRyZWU+fFByb21pc2U8Ym9vbGVhbnxVcmxUcmVlPnxib29sZWFufFVybFRyZWU7XG4iXX0=