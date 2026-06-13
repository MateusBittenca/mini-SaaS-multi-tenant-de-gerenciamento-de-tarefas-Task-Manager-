import type { Modifier } from '@dnd-kit/core';

function getEventCoordinates(event: Event): { x: number; y: number } | null {
  if ('clientX' in event && 'clientY' in event) {
    return { x: event.clientX as number, y: event.clientY as number };
  }
  if ('touches' in event && (event as TouchEvent).touches.length > 0) {
    const touch = (event as TouchEvent).touches[0];
    return { x: touch.clientX, y: touch.clientY };
  }
  return null;
}

/** Keeps the grab point under the cursor instead of anchoring to the card's top-left */
export const snapToCursor: Modifier = ({ transform, activatorEvent, draggingNodeRect }) => {
  if (!draggingNodeRect || !activatorEvent) return transform;

  const coords = getEventCoordinates(activatorEvent);
  if (!coords) return transform;

  const offsetX = coords.x - draggingNodeRect.left;
  const offsetY = coords.y - draggingNodeRect.top;

  return {
    x: transform.x + offsetX,
    y: transform.y + offsetY,
    scaleX: transform.scaleX,
    scaleY: transform.scaleY,
  };
};
