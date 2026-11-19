/** Touch fallback for browsers that do not reliably dispatch contextmenu on long press. */
export const createLongPressHandlers = () => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let startPoint: { clientX: number; clientY: number } | undefined;
  let fired = false;

  const clear = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    startPoint = undefined;
  };

  const cancel = () => {
    clear();
    fired = false;
  };

  const start = (event: TouchEvent) => {
    cancel();
    // Android already emits contextmenu; adding another trigger would open the menu twice.
    if (navigator.maxTouchPoints === 0 || /Android/i.test(navigator.userAgent) || event.touches.length !== 1) return;
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    const { clientX, clientY } = event.touches[0];
    startPoint = { clientX, clientY };
    timer = setTimeout(() => {
      clear();
      if (!target.isConnected) return;
      fired = true;
      target.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true, composed: true, cancelable: true, clientX, clientY,
      }));
    }, 500);
  };

  const move = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      clear();
      return;
    }
    if (!startPoint) return;
    const { clientX, clientY } = event.touches[0];
    if (Math.abs(clientX - startPoint.clientX) > 10 || Math.abs(clientY - startPoint.clientY) > 10) clear();
  };

  // Lit reads listener options from the handler. A long press must not also generate a click.
  const end = Object.assign((event: TouchEvent) => {
    if (fired) event.preventDefault();
    cancel();
  }, { passive: false });

  return { start, move, end, cancel };
};
