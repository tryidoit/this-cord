import { lazy, Suspense } from "react";

// Code-split a component; each use gets its own Suspense so nothing else blanks while it loads.
export function lazyLoad(loader) {
  const C = lazy(loader);
  return function Lazy(props) {
    return (
      <Suspense fallback={null}>
        <C {...props} />
      </Suspense>
    );
  };
}
