import { describe, it, expect } from 'vitest';
import type { AnnotationRect } from '../../src/types';

describe('PDF Coordinate Transformations & Normalization', () => {
  it('scales PDF points to viewport canvas pixels correctly', () => {
    const pdfRect: AnnotationRect = {
      x: 72,   // 1 inch in 72 DPI PDF coordinates
      y: 144,  // 2 inches
      width: 216, // 3 inches
      height: 36, // 0.5 inch
    };

    const scale = 1.5;
    const viewportRect = {
      left: pdfRect.x * scale,
      top: pdfRect.y * scale,
      width: pdfRect.width * scale,
      height: pdfRect.height * scale,
    };

    expect(viewportRect.left).toBe(108);
    expect(viewportRect.top).toBe(216);
    expect(viewportRect.width).toBe(324);
    expect(viewportRect.height).toBe(54);
  });

  it('normalizes fractional coordinates for zoom-independent highlight persistence', () => {
    const pageWidth = 612; // standard 8.5 x 11 in points
    const pageHeight = 792;

    const highlightBox = {
      x: 100,
      y: 200,
      width: 412,
      height: 20,
    };

    const normalized = {
      x: highlightBox.x / pageWidth,
      y: highlightBox.y / pageHeight,
      width: highlightBox.width / pageWidth,
      height: highlightBox.height / pageHeight,
    };

    expect(normalized.x).toBeCloseTo(0.1634, 3);
    expect(normalized.y).toBeCloseTo(0.2525, 3);
    expect(normalized.width).toBeCloseTo(0.6732, 3);
    expect(normalized.height).toBeCloseTo(0.0253, 3);

    // Reconstruct at different zoom
    const zoomScale = 2.0;
    const scaledWidth = pageWidth * zoomScale;
    const scaledHeight = pageHeight * zoomScale;

    const reconstructed = {
      x: normalized.x * scaledWidth,
      y: normalized.y * scaledHeight,
      width: normalized.width * scaledWidth,
      height: normalized.height * scaledHeight,
    };

    expect(reconstructed.x).toBeCloseTo(200, 1);
    expect(reconstructed.y).toBeCloseTo(400, 1);
    expect(reconstructed.width).toBeCloseTo(824, 1);
    expect(reconstructed.height).toBeCloseTo(40, 1);
  });
});
