export type ReadReceiptAnchor =
  | 'top-right'
  | 'bottom-right'
  | 'top-left'
  | 'bottom-left'
  | 'top-center'
  | 'bottom-center';

export interface ReadReceiptPosition {
  top: number;
  left: number;
  anchor: ReadReceiptAnchor;
  maxHeight: number;
}

export interface ReadReceiptLayoutInput {
  viewportWidth: number;
  viewportHeight: number;
  statusTop: number;
  statusBottom: number;
  statusLeft: number;
  statusRight: number;
}

const POPOVER_WIDTH = 344;
const POPOVER_MAX_HEIGHT = 420;
const VIEWPORT_SAFE_GAP = 8;
const STATUS_HORIZONTAL_OFFSET = 20;

const clamp = (value: number, min: number, max: number): number => (
  Math.min(Math.max(value, min), max)
);

export const calculateReadReceiptLayout = ({
  viewportWidth,
  viewportHeight,
  statusTop,
  statusBottom,
  statusLeft,
  statusRight,
}: ReadReceiptLayoutInput): ReadReceiptPosition => {
  const maxAnchor = Math.max(viewportHeight - VIEWPORT_SAFE_GAP, 0);
  const minAnchor = Math.min(VIEWPORT_SAFE_GAP, maxAnchor);
  const topAnchor = clamp(statusTop, minAnchor, maxAnchor);
  const bottomAnchor = clamp(statusBottom, minAnchor, maxAnchor);
  const spaceBelow = Math.max(viewportHeight - topAnchor - VIEWPORT_SAFE_GAP, 0);
  const spaceAbove = Math.max(bottomAnchor - VIEWPORT_SAFE_GAP, 0);
  const placeBelow = spaceBelow >= spaceAbove;
  const verticalAnchor = placeBelow ? 'top' : 'bottom';
  const maxHeight = Math.min(POPOVER_MAX_HEIGHT, placeBelow ? spaceBelow : spaceAbove);

  let left: number;
  let horizontalAnchor: 'right' | 'left' | 'center';
  const canFitOnLeft = statusLeft - POPOVER_WIDTH >= 0;
  const canFitOnRight = statusRight + STATUS_HORIZONTAL_OFFSET + POPOVER_WIDTH <= viewportWidth;

  if (canFitOnLeft) {
    left = statusLeft;
    horizontalAnchor = 'right';
  } else if (canFitOnRight) {
    left = statusRight + STATUS_HORIZONTAL_OFFSET;
    horizontalAnchor = 'left';
  } else {
    left = viewportWidth / 2;
    horizontalAnchor = 'center';
  }

  return {
    top: placeBelow ? topAnchor : bottomAnchor,
    left,
    anchor: `${verticalAnchor}-${horizontalAnchor}` as ReadReceiptAnchor,
    maxHeight,
  };
};

export const calculateReadReceiptFallbackLayout = (
  viewportWidth: number,
  viewportHeight: number,
): ReadReceiptPosition => ({
  top: VIEWPORT_SAFE_GAP,
  left: viewportWidth / 2,
  anchor: 'top-center',
  maxHeight: Math.max(
    0,
    Math.min(POPOVER_MAX_HEIGHT, viewportHeight - VIEWPORT_SAFE_GAP * 2),
  ),
});
