/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { concat, defer, from, of } from 'rxjs';
import { concatMap, first, map, mergeMap } from 'rxjs/operators';
import { ActivationStart, ChildActivationStart } from '../events';
import { wrapIntoObservable } from '../utils/collection';
import { getCanActivateChild, getToken } from '../utils/preactivation';
import { isBoolean, isCanActivate, isCanActivateChild, isCanDeactivate, isFunction } from '../utils/type_guards';
import { prioritizedGuardValue } from './prioritized_guard_value';
export function checkGuards(moduleInjector, forwardEvent) {
    return mergeMap(t => {
        const { targetSnapshot, currentSnapshot, guards: { canActivateChecks, canDeactivateChecks } } = t;
        if (canDeactivateChecks.length === 0 && canActivateChecks.length === 0) {
            return of({ ...t, guardsResult: true });
        }
        return runCanDeactivateChecks(canDeactivateChecks, targetSnapshot, currentSnapshot, moduleInjector)
            .pipe(mergeMap(canDeactivate => {
            return canDeactivate && isBoolean(canDeactivate) ?
                runCanActivateChecks(targetSnapshot, canActivateChecks, moduleInjector, forwardEvent) :
                of(canDeactivate);
        }), map(guardsResult => ({ ...t, guardsResult })));
    });
}
function runCanDeactivateChecks(checks, futureRSS, currRSS, moduleInjector) {
    return from(checks).pipe(mergeMap(check => runCanDeactivate(check.component, check.route, currRSS, futureRSS, moduleInjector)), first(result => {
        return result !== true;
    }, true));
}
function runCanActivateChecks(futureSnapshot, checks, moduleInjector, forwardEvent) {
    return from(checks).pipe(concatMap((check) => {
        return concat(fireChildActivationStart(check.route.parent, forwardEvent), fireActivationStart(check.route, forwardEvent), runCanActivateChild(futureSnapshot, check.path, moduleInjector), runCanActivate(futureSnapshot, check.route, moduleInjector));
    }), first(result => {
        return result !== true;
    }, true));
}
/**
 * This should fire off `ActivationStart` events for each route being activated at this
 * level.
 * In other words, if you're activating `a` and `b` below, `path` will contain the
 * `ActivatedRouteSnapshot`s for both and we will fire `ActivationStart` for both. Always
 * return
 * `true` so checks continue to run.
 */
function fireActivationStart(snapshot, forwardEvent) {
    if (snapshot !== null && forwardEvent) {
        forwardEvent(new ActivationStart(snapshot));
    }
    return of(true);
}
/**
 * This should fire off `ChildActivationStart` events for each route being activated at this
 * level.
 * In other words, if you're activating `a` and `b` below, `path` will contain the
 * `ActivatedRouteSnapshot`s for both and we will fire `ChildActivationStart` for both. Always
 * return
 * `true` so checks continue to run.
 */
function fireChildActivationStart(snapshot, forwardEvent) {
    if (snapshot !== null && forwardEvent) {
        forwardEvent(new ChildActivationStart(snapshot));
    }
    return of(true);
}
function runCanActivate(futureRSS, futureARS, moduleInjector) {
    const canActivate = futureARS.routeConfig ? futureARS.routeConfig.canActivate : null;
    if (!canActivate || canActivate.length === 0)
        return of(true);
    const canActivateObservables = canActivate.map((c) => {
        return defer(() => {
            const guard = getToken(c, futureARS, moduleInjector);
            let observable;
            if (isCanActivate(guard)) {
                observable = wrapIntoObservable(guard.canActivate(futureARS, futureRSS));
            }
            else if (isFunction(guard)) {
                observable = wrapIntoObservable(guard(futureARS, futureRSS));
            }
            else {
                throw new Error('Invalid CanActivate guard');
            }
            return observable.pipe(first());
        });
    });
    return of(canActivateObservables).pipe(prioritizedGuardValue());
}
function runCanActivateChild(futureRSS, path, moduleInjector) {
    const futureARS = path[path.length - 1];
    const canActivateChildGuards = path.slice(0, path.length - 1)
        .reverse()
        .map(p => getCanActivateChild(p))
        .filter(_ => _ !== null);
    const canActivateChildGuardsMapped = canActivateChildGuards.map((d) => {
        return defer(() => {
            const guardsMapped = d.guards.map((c) => {
                const guard = getToken(c, d.node, moduleInjector);
                let observable;
                if (isCanActivateChild(guard)) {
                    observable = wrapIntoObservable(guard.canActivateChild(futureARS, futureRSS));
                }
                else if (isFunction(guard)) {
                    observable = wrapIntoObservable(guard(futureARS, futureRSS));
                }
                else {
                    throw new Error('Invalid CanActivateChild guard');
                }
                return observable.pipe(first());
            });
            return of(guardsMapped).pipe(prioritizedGuardValue());
        });
    });
    return of(canActivateChildGuardsMapped).pipe(prioritizedGuardValue());
}
function runCanDeactivate(component, currARS, currRSS, futureRSS, moduleInjector) {
    const canDeactivate = currARS && currARS.routeConfig ? currARS.routeConfig.canDeactivate : null;
    if (!canDeactivate || canDeactivate.length === 0)
        return of(true);
    const canDeactivateObservables = canDeactivate.map((c) => {
        const guard = getToken(c, currARS, moduleInjector);
        let observable;
        if (isCanDeactivate(guard)) {
            observable = wrapIntoObservable(guard.canDeactivate(component, currARS, currRSS, futureRSS));
        }
        else if (isFunction(guard)) {
            observable = wrapIntoObservable(guard(component, currARS, currRSS, futureRSS));
        }
        else {
            throw new Error('Invalid CanDeactivate guard');
        }
        return observable.pipe(first());
    });
    return of(canDeactivateObservables).pipe(prioritizedGuardValue());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tfZ3VhcmRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9vcGVyYXRvcnMvY2hlY2tfZ3VhcmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUdILE9BQU8sRUFBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBd0MsRUFBRSxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQ25GLE9BQU8sRUFBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUUvRCxPQUFPLEVBQUMsZUFBZSxFQUFFLG9CQUFvQixFQUFRLE1BQU0sV0FBVyxDQUFDO0FBS3ZFLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQ3ZELE9BQU8sRUFBNkIsbUJBQW1CLEVBQUUsUUFBUSxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDakcsT0FBTyxFQUFDLFNBQVMsRUFBRSxhQUFhLEVBQUUsa0JBQWtCLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBQyxNQUFNLHNCQUFzQixDQUFDO0FBRS9HLE9BQU8sRUFBQyxxQkFBcUIsRUFBQyxNQUFNLDJCQUEyQixDQUFDO0FBRWhFLE1BQU0sVUFBVSxXQUFXLENBQUMsY0FBd0IsRUFBRSxZQUFtQztJQUV2RixPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNsQixNQUFNLEVBQUMsY0FBYyxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsRUFBQyxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBQyxFQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzlGLElBQUksbUJBQW1CLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3RFLE9BQU8sRUFBRSxDQUFDLEVBQUMsR0FBRyxDQUFDLEVBQUUsWUFBWSxFQUFF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Q0FBQztJQUNsQyxDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sRUFBRSxDQUFDLHdCQUF3QixDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUMsQ0FBQztBQUNwRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7SW5qZWN0b3J9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtjb25jYXQsIGRlZmVyLCBmcm9tLCBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb24sIE9ic2VydmFibGUsIG9mfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y29uY2F0TWFwLCBmaXJzdCwgbWFwLCBtZXJnZU1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0FjdGl2YXRpb25TdGFydCwgQ2hpbGRBY3RpdmF0aW9uU3RhcnQsIEV2ZW50fSBmcm9tICcuLi9ldmVudHMnO1xuaW1wb3J0IHtDYW5BY3RpdmF0ZUNoaWxkRm4sIENhbkFjdGl2YXRlRm4sIENhbkRlYWN0aXZhdGVGbn0gZnJvbSAnLi4vbW9kZWxzJztcbmltcG9ydCB7TmF2aWdhdGlvblRyYW5zaXRpb259IGZyb20gJy4uL3JvdXRlcic7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3QsIFJvdXRlclN0YXRlU25hcHNob3R9IGZyb20gJy4uL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1VybFRyZWV9IGZyb20gJy4uL3VybF90cmVlJztcbmltcG9ydCB7d3JhcEludG9PYnNlcnZhYmxlfSBmcm9tICcuLi91dGlscy9jb2xsZWN0aW9uJztcbmltcG9ydCB7Q2FuQWN0aXZhdGUsIENhbkRlYWN0aXZhdGUsIGdldENhbkFjdGl2YXRlQ2hpbGQsIGdldFRva2VufSBmcm9tICcuLi91dGlscy9wcmVhY3RpdmF0aW9uJztcbmltcG9ydCB7aXNCb29sZWFuLCBpc0NhbkFjdGl2YXRlLCBpc0NhbkFjdGl2YXRlQ2hpbGQsIGlzQ2FuRGVhY3RpdmF0ZSwgaXNGdW5jdGlvbn0gZnJvbSAnLi4vdXRpbHMvdHlwZV9ndWFyZHMnO1xuXG5pbXBvcnQge3ByaW9yaXRpemVkR3VhcmRWYWx1ZX0gZnJvbSAnLi9wcmlvcml0aXplZF9ndWFyZF92YWx1ZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjaGVja0d1YXJkcyhtb2R1bGVJbmplY3RvcjogSW5qZWN0b3IsIGZvcndhcmRFdmVudD86IChldnQ6IEV2ZW50KSA9PiB2b2lkKTpcbiAgICBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb248TmF2aWdhdGlvblRyYW5zaXRpb24+IHtcbiAgcmV0dXJuIG1lcmdlTWFwKHQgPT4ge1xuICAgIGNvbnN0IHt0YXJnZXRTbmFwc2hvdCwgY3VycmVudFNuYXBzaG90LCBndWFyZHM6IHtjYW5BY3RpdmF0ZUNoZWNrcywgY2FuRGVhY3RpdmF0ZUNoZWNrc319ID0gdDtcbiAgICBpZiAoY2FuRGVhY3RpdmF0ZUNoZWNrcy5sZW5ndGggPT09IDAgJiYgY2FuQWN0aXZhdGVDaGVja3MubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gb2Yoey4uLnQsIGd1YXJkc1Jlc3VsdDogdHJ1ZX0pO1xuICAgIH1cblxuICAgIHJldHVybiBydW5DYW5EZWFjdGl2YXRlQ2hlY2tzKFxuICAgICAgICAgICAgICAgY2FuRGVhY3RpdmF0ZUNoZWNrcywgdGFyZ2V0U25hcHNob3QhLCBjdXJyZW50U25hcHNob3QsIG1vZHVsZUluamVjdG9yKVxuICAgICAgICAucGlwZShcbiAgICAgICAgICAgIG1lcmdlTWFwKGNhbkRlYWN0aXZhdGUgPT4ge1xuICAgICAgICAgICAgICByZXR1cm4gY2FuRGVhY3RpdmF0ZSAmJiBpc0Jvb2xlYW4oY2FuRGVhY3RpdmF0ZSkgP1xuICAgICAgICAgICAgICAgICAgcnVuQ2FuQWN0aXZhdGVDaGVja3MoXG4gICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0U25hcHNob3QhLCBjYW5BY3RpdmF0ZUNoZWNrcywgbW9kdWxlSW5qZWN0b3IsIGZvcndhcmRFdmVudCkgOlxuICAgICAgICAgICAgICAgICAgb2YoY2FuRGVhY3RpdmF0ZSk7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIG1hcChndWFyZHNSZXN1bHQgPT4gKHsuLi50LCBndWFyZHNSZXN1bHR9KSkpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcnVuQ2FuRGVhY3RpdmF0ZUNoZWNrcyhcbiAgICBjaGVja3M6IENhbkRlYWN0aXZhdGVbXSwgZnV0dXJlUlNTOiBSb3V0ZXJTdGF0ZVNuYXBzaG90LCBjdXJyUlNTOiBSb3V0ZXJTdGF0ZVNuYXBzaG90LFxuICAgIG1vZHVsZUluamVjdG9yOiBJbmplY3Rvcikge1xuICByZXR1cm4gZnJvbShjaGVja3MpLnBpcGUoXG4gICAgICBtZXJnZU1hcChcbiAgICAgICAgICBjaGVjayA9PlxuICAgICAgICAgICAgICBydW5DYW5EZWFjdGl2YXRlKGNoZWNrLmNvbXBvbmVudCwgY2hlY2sucm91dGUsIGN1cnJSU1MsIGZ1dHVyZVJTUywgbW9kdWxlSW5qZWN0b3IpKSxcbiAgICAgIGZpcnN0KHJlc3VsdCA9PiB7XG4gICAgICAgIHJldHVybiByZXN1bHQgIT09IHRydWU7XG4gICAgICB9LCB0cnVlIGFzIGJvb2xlYW4gfCBVcmxUcmVlKSk7XG59XG5cbmZ1bmN0aW9uIHJ1bkNhbkFjdGl2YXRlQ2hlY2tzKFxuICAgIGZ1dHVyZVNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90LCBjaGVja3M6IENhbkFjdGl2YXRlW10sIG1vZHVsZUluamVjdG9yOiBJbmplY3RvcixcbiAgICBmb3J3YXJkRXZlbnQ/OiAoZXZ0OiBFdmVudCkgPT4gdm9pZCkge1xuICByZXR1cm4gZnJvbShjaGVja3MpLnBpcGUoXG4gICAgICBjb25jYXRNYXAoKGNoZWNrOiBDYW5BY3RpdmF0ZSkgPT4ge1xuICAgICAgICByZXR1cm4gY29uY2F0KFxuICAgICAgICAgICAgZmlyZUNoaWxkQWN0aXZhdGlvblN0YXJ0KGNoZWNrLnJvdXRlLnBhcmVudCwgZm9yd2FyZEV2ZW50KSxcbiAgICAgICAgICAgIGZpcmVBY3RpdmF0aW9uU3RhcnQoY2hlY2sucm91dGUsIGZvcndhcmRFdmVudCksXG4gICAgICAgICAgICBydW5DYW5BY3RpdmF0ZUNoaWxkKGZ1dHVyZVNuYXBzaG90LCBjaGVjay5wYXRoLCBtb2R1bGVJbmplY3RvciksXG4gICAgICAgICAgICBydW5DYW5BY3RpdmF0ZShmdXR1cmVTbmFwc2hvdCwgY2hlY2sucm91dGUsIG1vZHVsZUluamVjdG9yKSk7XG4gICAgICB9KSxcbiAgICAgIGZpcnN0KHJlc3VsdCA9PiB7XG4gICAgICAgIHJldHVybiByZXN1bHQgIT09IHRydWU7XG4gICAgICB9LCB0cnVlIGFzIGJvb2xlYW4gfCBVcmxUcmVlKSk7XG59XG5cbi8qKlxuICogVGhpcyBzaG91bGQgZmlyZSBvZmYgYEFjdGl2YXRpb25TdGFydGAgZXZlbnRzIGZvciBlYWNoIHJvdXRlIGJlaW5nIGFjdGl2YXRlZCBhdCB0aGlzXG4gKiBsZXZlbC5cbiAqIEluIG90aGVyIHdvcmRzLCBpZiB5b3UncmUgYWN0aXZhdGluZyBgYWAgYW5kIGBiYCBiZWxvdywgYHBhdGhgIHdpbGwgY29udGFpbiB0aGVcbiAqIGBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90YHMgZm9yIGJvdGggYW5kIHdlIHdpbGwgZmlyZSBgQWN0aXZhdGlvblN0YXJ0YCBmb3IgYm90aC4gQWx3YXlzXG4gKiByZXR1cm5cbiAqIGB0cnVlYCBzbyBjaGVja3MgY29udGludWUgdG8gcnVuLlxuICovXG5mdW5jdGlvbiBmaXJlQWN0aXZhdGlvblN0YXJ0KFxuICAgIHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90fG51bGwsXG4gICAgZm9yd2FyZEV2ZW50PzogKGV2dDogRXZlbnQpID0+IHZvaWQpOiBPYnNlcnZhYmxlPGJvb2xlYW4+IHtcbiAgaWYgKHNuYXBzaG90ICE9PSBudWxsICYmIGZvcndhcmRFdmVudCkge1xuICAgIGZvcndhcmRFdmVudChuZXcgQWN0aXZhdGlvblN0YXJ0KHNuYXBzaG90KSk7XG4gIH1cbiAgcmV0dXJuIG9mKHRydWUpO1xufVxuXG4vKipcbiAqIFRoaXMgc2hvdWxkIGZpcmUgb2ZmIGBDaGlsZEFjdGl2YXRpb25TdGFydGAgZXZlbnRzIGZvciBlYWNoIHJvdXRlIGJlaW5nIGFjdGl2YXRlZCBhdCB0aGlzXG4gKiBsZXZlbC5cbiAqIEluIG90aGVyIHdvcmRzLCBpZiB5b3UncmUgYWN0aXZhdGluZyBgYWAgYW5kIGBiYCBiZWxvdywgYHBhdGhgIHdpbGwgY29udGFpbiB0aGVcbiAqIGBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90YHMgZm9yIGJvdGggYW5kIHdlIHdpbGwgZmlyZSBgQ2hpbGRBY3RpdmF0aW9uU3RhcnRgIGZvciBib3RoLiBBbHdheXNcbiAqIHJldHVyblxuICogYHRydWVgIHNvIGNoZWNrcyBjb250aW51ZSB0byBydW4uXG4gKi9cbmZ1bmN0aW9uIGZpcmVDaGlsZEFjdGl2YXRpb25TdGFydChcbiAgICBzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdHxudWxsLFxuICAgIGZvcndhcmRFdmVudD86IChldnQ6IEV2ZW50KSA9PiB2b2lkKTogT2JzZXJ2YWJsZTxib29sZWFuPiB7XG4gIGlmIChzbmFwc2hvdCAhPT0gbnVsbCAmJiBmb3J3YXJkRXZlbnQpIHtcbiAgICBmb3J3YXJkRXZlbnQobmV3IENoaWxkQWN0aXZhdGlvblN0YXJ0KHNuYXBzaG90KSk7XG4gIH1cbiAgcmV0dXJuIG9mKHRydWUpO1xufVxuXG5mdW5jdGlvbiBydW5DYW5BY3RpdmF0ZShcbiAgICBmdXR1cmVSU1M6IFJvdXRlclN0YXRlU25hcHNob3QsIGZ1dHVyZUFSUzogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCxcbiAgICBtb2R1bGVJbmplY3RvcjogSW5qZWN0b3IpOiBPYnNlcnZhYmxlPGJvb2xlYW58VXJsVHJlZT4ge1xuICBjb25zdCBjYW5BY3RpdmF0ZSA9IGZ1dHVyZUFSUy5yb3V0ZUNvbmZpZyA/IGZ1dHVyZUFSUy5yb3V0ZUNvbmZpZy5jYW5BY3RpdmF0ZSA6IG51bGw7XG4gIGlmICghY2FuQWN0aXZhdGUgfHwgY2FuQWN0aXZhdGUubGVuZ3RoID09PSAwKSByZXR1cm4gb2YodHJ1ZSk7XG5cbiAgY29uc3QgY2FuQWN0aXZhdGVPYnNlcnZhYmxlcyA9IGNhbkFjdGl2YXRlLm1hcCgoYzogYW55KSA9PiB7XG4gICAgcmV0dXJuIGRlZmVyKCgpID0+IHtcbiAgICAgIGNvbnN0IGd1YXJkID0gZ2V0VG9rZW4oYywgZnV0dXJlQVJTLCBtb2R1bGVJbmplY3Rvcik7XG4gICAgICBsZXQgb2JzZXJ2YWJsZTtcbiAgICAgIGlmIChpc0NhbkFjdGl2YXRlKGd1YXJkKSkge1xuICAgICAgICBvYnNlcnZhYmxlID0gd3JhcEludG9PYnNlcnZhYmxlKGd1YXJkLmNhbkFjdGl2YXRlKGZ1dHVyZUFSUywgZnV0dXJlUlNTKSk7XG4gICAgICB9IGVsc2UgaWYgKGlzRnVuY3Rpb248Q2FuQWN0aXZhdGVGbj4oZ3VhcmQpKSB7XG4gICAgICAgIG9ic2VydmFibGUgPSB3cmFwSW50b09ic2VydmFibGUoZ3VhcmQoZnV0dXJlQVJTLCBmdXR1cmVSU1MpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBDYW5BY3RpdmF0ZSBndWFyZCcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9ic2VydmFibGUucGlwZShmaXJzdCgpKTtcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBvZihjYW5BY3RpdmF0ZU9ic2VydmFibGVzKS5waXBlKHByaW9yaXRpemVkR3VhcmRWYWx1ZSgpKTtcbn1cblxuZnVuY3Rpb24gcnVuQ2FuQWN0aXZhdGVDaGlsZChcbiAgICBmdXR1cmVSU1M6IFJvdXRlclN0YXRlU25hcHNob3QsIHBhdGg6IEFjdGl2YXRlZFJvdXRlU25hcHNob3RbXSxcbiAgICBtb2R1bGVJbmplY3RvcjogSW5qZWN0b3IpOiBPYnNlcnZhYmxlPGJvb2xlYW58VXJsVHJlZT4ge1xuICBjb25zdCBmdXR1cmVBUlMgPSBwYXRoW3BhdGgubGVuZ3RoIC0gMV07XG5cbiAgY29uc3QgY2FuQWN0aXZhdGVDaGlsZEd1YXJkcyA9IHBhdGguc2xpY2UoMCwgcGF0aC5sZW5ndGggLSAxKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXZlcnNlKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKHAgPT4gZ2V0Q2FuQWN0aXZhdGVDaGlsZChwKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKF8gPT4gXyAhPT0gbnVsbCk7XG5cbiAgY29uc3QgY2FuQWN0aXZhdGVDaGlsZEd1YXJkc01hcHBlZCA9IGNhbkFjdGl2YXRlQ2hpbGRHdWFyZHMubWFwKChkOiBhbnkpID0+IHtcbiAgICByZXR1cm4gZGVmZXIoKCkgPT4ge1xuICAgICAgY29uc3QgZ3VhcmRzTWFwcGVkID0gZC5ndWFyZHMubWFwKChjOiBhbnkpID0+IHtcbiAgICAgICAgY29uc3QgZ3VhcmQgPSBnZXRUb2tlbihjLCBkLm5vZGUsIG1vZHVsZUluamVjdG9yKTtcbiAgICAgICAgbGV0IG9ic2VydmFibGU7XG4gICAgICAgIGlmIChpc0NhbkFjdGl2YXRlQ2hpbGQoZ3VhcmQpKSB7XG4gICAgICAgICAgb2JzZXJ2YWJsZSA9IHdyYXBJbnRvT2JzZXJ2YWJsZShndWFyZC5jYW5BY3RpdmF0ZUNoaWxkKGZ1dHVyZUFSUywgZnV0dXJlUlNTKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbjxDYW5BY3RpdmF0ZUNoaWxkRm4+KGd1YXJkKSkge1xuICAgICAgICAgIG9ic2VydmFibGUgPSB3cmFwSW50b09ic2VydmFibGUoZ3VhcmQoZnV0dXJlQVJTLCBmdXR1cmVSU1MpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgQ2FuQWN0aXZhdGVDaGlsZCBndWFyZCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvYnNlcnZhYmxlLnBpcGUoZmlyc3QoKSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBvZihndWFyZHNNYXBwZWQpLnBpcGUocHJpb3JpdGl6ZWRHdWFyZFZhbHVlKCkpO1xuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIG9mKGNhbkFjdGl2YXRlQ2hpbGRHdWFyZHNNYXBwZWQpLnBpcGUocHJpb3JpdGl6ZWRHdWFyZFZhbHVlKCkpO1xufVxuXG5mdW5jdGlvbiBydW5DYW5EZWFjdGl2YXRlKFxuICAgIGNvbXBvbmVudDogT2JqZWN0fG51bGwsIGN1cnJBUlM6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIGN1cnJSU1M6IFJvdXRlclN0YXRlU25hcHNob3QsXG4gICAgZnV0dXJlUlNTOiBSb3V0ZXJTdGF0ZVNuYXBzaG90LCBtb2R1bGVJbmplY3RvcjogSW5qZWN0b3IpOiBPYnNlcnZhYmxlPGJvb2xlYW58VXJsVHJlZT4ge1xuICBjb25zdCBjYW5EZWFjdGl2YXRlID0gY3VyckFSUyAmJiBjdXJyQVJTLnJvdXRlQ29uZmlnID8gY3VyckFSUy5yb3V0ZUNvbmZpZy5jYW5EZWFjdGl2YXRlIDogbnVsbDtcbiAgaWYgKCFjYW5EZWFjdGl2YXRlIHx8IGNhbkRlYWN0aXZhdGUubGVuZ3RoID09PSAwKSByZXR1cm4gb2YodHJ1ZSk7XG4gIGNvbnN0IGNhbkRlYWN0aXZhdGVPYnNlcnZhYmxlcyA9IGNhbkRlYWN0aXZhdGUubWFwKChjOiBhbnkpID0+IHtcbiAgICBjb25zdCBndWFyZCA9IGdldFRva2VuKGMsIGN1cnJBUlMsIG1vZHVsZUluamVjdG9yKTtcbiAgICBsZXQgb2JzZXJ2YWJsZTtcbiAgICBpZiAoaXNDYW5EZWFjdGl2YXRlKGd1YXJkKSkge1xuICAgICAgb2JzZXJ2YWJsZSA9IHdyYXBJbnRvT2JzZXJ2YWJsZShndWFyZC5jYW5EZWFjdGl2YXRlKGNvbXBvbmVudCEsIGN1cnJBUlMsIGN1cnJSU1MsIGZ1dHVyZVJTUykpO1xuICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbjxDYW5EZWFjdGl2YXRlRm48YW55Pj4oZ3VhcmQpKSB7XG4gICAgICBvYnNlcnZhYmxlID0gd3JhcEludG9PYnNlcnZhYmxlKGd1YXJkKGNvbXBvbmVudCwgY3VyckFSUywgY3VyclJTUywgZnV0dXJlUlNTKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBDYW5EZWFjdGl2YXRlIGd1YXJkJyk7XG4gICAgfVxuICAgIHJldHVybiBvYnNlcnZhYmxlLnBpcGUoZmlyc3QoKSk7XG4gIH0pO1xuICByZXR1cm4gb2YoY2FuRGVhY3RpdmF0ZU9ic2VydmFibGVzKS5waXBlKHByaW9yaXRpemVkR3VhcmRWYWx1ZSgpKTtcbn1cbiJdfQ==