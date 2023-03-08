/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { inject, Injectable } from '@angular/core';
import * as i0 from "@angular/core";
/**
 * @description
 *
 * Provides a way to migrate AngularJS applications to Angular.
 *
 * @publicApi
 */
class UrlHandlingStrategy {
}
UrlHandlingStrategy.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0-next.2+sha-8525583", ngImport: i0, type: UrlHandlingStrategy, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
UrlHandlingStrategy.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.0.0-next.2+sha-8525583", ngImport: i0, type: UrlHandlingStrategy, providedIn: 'root', useFactory: () => inject(DefaultUrlHandlingStrategy) });
export { UrlHandlingStrategy };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0-next.2+sha-8525583", ngImport: i0, type: UrlHandlingStrategy, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root', useFactory: () => inject(DefaultUrlHandlingStrategy) }]
        }] });
/**
 * @publicApi
 */
class DefaultUrlHandlingStrategy {
    shouldProcessUrl(url) {
        return true;
    }
    extract(url) {
        return url;
    }
    merge(newUrlPart, wholeUrl) {
        return newUrlPart;
    }
}
DefaultUrlHandlingStrategy.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0-next.2+sha-8525583", ngImport: i0, type: DefaultUrlHandlingStrategy, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
DefaultUrlHandlingStrategy.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.0.0-next.2+sha-8525583", ngImport: i0, type: DefaultUrlHandlingStrategy, providedIn: 'root' });
export { DefaultUrlHandlingStrategy };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0-next.2+sha-8525583", ngImport: i0, type: DefaultUrlHandlingStrategy, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsX2hhbmRsaW5nX3N0cmF0ZWd5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy91cmxfaGFuZGxpbmdfc3RyYXRlZ3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUMsTUFBTSxlQUFlLENBQUM7O0FBSWpEOzs7Ozs7R0FNRztBQUNILE1BQ3NCLG1CQUFtQjs7MkhBQW5CLG1CQUFtQjsrSEFBbkIsbUJBQW1CLGNBRGhCLE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsMEJBQTBCLENBQUM7U0FDL0QsbUJBQW1CO3NHQUFuQixtQkFBbUI7a0JBRHhDLFVBQVU7bUJBQUMsRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsMEJBQTBCLENBQUMsRUFBQzs7QUF3QnRGOztHQUVHO0FBQ0gsTUFDYSwwQkFBMEI7SUFDckMsZ0JBQWdCLENBQUMsR0FBWTtRQUMzQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFDRCxPQUFPLENBQUMsR0FBWTtRQUNsQixPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFDRCxLQUFLLENBQUMsVUFBbUIsRUFBRSxRQUFpQjtRQUMxQyxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDOztrSUFUVSwwQkFBMEI7c0lBQTFCLDBCQUEwQixjQURkLE1BQU07U0FDbEIsMEJBQTBCO3NHQUExQiwwQkFBMEI7a0JBRHRDLFVBQVU7bUJBQUMsRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7aW5qZWN0LCBJbmplY3RhYmxlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHtVcmxUcmVlfSBmcm9tICcuL3VybF90cmVlJztcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBQcm92aWRlcyBhIHdheSB0byBtaWdyYXRlIEFuZ3VsYXJKUyBhcHBsaWNhdGlvbnMgdG8gQW5ndWxhci5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCcsIHVzZUZhY3Rvcnk6ICgpID0+IGluamVjdChEZWZhdWx0VXJsSGFuZGxpbmdTdHJhdGVneSl9KVxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFVybEhhbmRsaW5nU3RyYXRlZ3kge1xuICAvKipcbiAgICogVGVsbHMgdGhlIHJvdXRlciBpZiB0aGlzIFVSTCBzaG91bGQgYmUgcHJvY2Vzc2VkLlxuICAgKlxuICAgKiBXaGVuIGl0IHJldHVybnMgdHJ1ZSwgdGhlIHJvdXRlciB3aWxsIGV4ZWN1dGUgdGhlIHJlZ3VsYXIgbmF2aWdhdGlvbi5cbiAgICogV2hlbiBpdCByZXR1cm5zIGZhbHNlLCB0aGUgcm91dGVyIHdpbGwgc2V0IHRoZSByb3V0ZXIgc3RhdGUgdG8gYW4gZW1wdHkgc3RhdGUuXG4gICAqIEFzIGEgcmVzdWx0LCBhbGwgdGhlIGFjdGl2ZSBjb21wb25lbnRzIHdpbGwgYmUgZGVzdHJveWVkLlxuICAgKlxuICAgKi9cbiAgYWJzdHJhY3Qgc2hvdWxkUHJvY2Vzc1VybCh1cmw6IFVybFRyZWUpOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBFeHRyYWN0cyB0aGUgcGFydCBvZiB0aGUgVVJMIHRoYXQgc2hvdWxkIGJlIGhhbmRsZWQgYnkgdGhlIHJvdXRlci5cbiAgICogVGhlIHJlc3Qgb2YgdGhlIFVSTCB3aWxsIHJlbWFpbiB1bnRvdWNoZWQuXG4gICAqL1xuICBhYnN0cmFjdCBleHRyYWN0KHVybDogVXJsVHJlZSk6IFVybFRyZWU7XG5cbiAgLyoqXG4gICAqIE1lcmdlcyB0aGUgVVJMIGZyYWdtZW50IHdpdGggdGhlIHJlc3Qgb2YgdGhlIFVSTC5cbiAgICovXG4gIGFic3RyYWN0IG1lcmdlKG5ld1VybFBhcnQ6IFVybFRyZWUsIHJhd1VybDogVXJsVHJlZSk6IFVybFRyZWU7XG59XG5cbi8qKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnfSlcbmV4cG9ydCBjbGFzcyBEZWZhdWx0VXJsSGFuZGxpbmdTdHJhdGVneSBpbXBsZW1lbnRzIFVybEhhbmRsaW5nU3RyYXRlZ3kge1xuICBzaG91bGRQcm9jZXNzVXJsKHVybDogVXJsVHJlZSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGV4dHJhY3QodXJsOiBVcmxUcmVlKTogVXJsVHJlZSB7XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuICBtZXJnZShuZXdVcmxQYXJ0OiBVcmxUcmVlLCB3aG9sZVVybDogVXJsVHJlZSk6IFVybFRyZWUge1xuICAgIHJldHVybiBuZXdVcmxQYXJ0O1xuICB9XG59XG4iXX0=