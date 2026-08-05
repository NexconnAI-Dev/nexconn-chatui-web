type ElementRefLike<T> = { value: T };

/**
 * Scroll control helper.
 * Disables scrolling while a menu is visible and restores it when hidden.
 * @param scrollElementRef - Scroll container or a ref-like `{ value }` object
 * @returns Controls for disabling and enabling scrolling
 */
export function createScrollControl(
  scrollElementRef: ElementRefLike<HTMLElement | undefined> | HTMLElement
) {
  let isScrollDisabled = false;

  // Resolve the underlying DOM element.
  const getElement = (): HTMLElement | null => {
    if (scrollElementRef instanceof HTMLElement) {
      return scrollElementRef;
    }
    return scrollElementRef.value || null;
  };

  // Prevent pointer-driven scrolling.
  const preventScroll = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Prevent keyboard scrolling.
  const preventKeyScroll = (e: KeyboardEvent) => {
    const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
    if (scrollKeys.includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Disable scrolling.
  const disableScroll = () => {
    if (isScrollDisabled) return;
    isScrollDisabled = true;
    const element = getElement();
    if (element) {
      element.addEventListener('wheel', preventScroll, { passive: false });
      element.addEventListener('touchmove', preventScroll, { passive: false });
      element.addEventListener('keydown', preventKeyScroll, { passive: false });
    }
  };

  // Enable scrolling.
  const enableScroll = () => {
    if (!isScrollDisabled) return;
    isScrollDisabled = false;
    const element = getElement();
    if (element) {
      element.removeEventListener('wheel', preventScroll);
      element.removeEventListener('touchmove', preventScroll);
      element.removeEventListener('keydown', preventKeyScroll);
    }
  };

  return {
    disableScroll,
    enableScroll,
    get isScrollDisabled() {
      return isScrollDisabled;
    },
  };
}
