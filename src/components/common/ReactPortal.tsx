import { createPortal } from "react-dom";
import { useState, useLayoutEffect } from "react";

interface ReactPortalProps {
  children: React.ReactNode;
  wrapperId: string;
}

/**
 * Internal creation inspired by LogRocket
 * https://blog.logrocket.com/build-modal-with-react-portals/
 */
const ReactPortal = ({ children, wrapperId = 'portal--wrapper' }: ReactPortalProps) => {
  const [wrapper, setWrapper] = useState<Element | null>(null);

  useLayoutEffect(() => {
    let systemCreated = false;
    let el = document.getElementById(wrapperId);

    // Element by supplied ID does not exist, create one internally and append to body
    if (!el) {
      el = document.createElement('div');
      el.setAttribute('id', wrapperId);
      document.body.appendChild(el);
      systemCreated = true;
    }
    setWrapper(el);

    // Handle cleanup for internally created elements
    return () => {
      if (el && systemCreated) {
        document.body.removeChild(el);
      }
    }
  }, [wrapperId]);

  return wrapper ? createPortal(children, wrapper) : null;
};
  

export default ReactPortal;