import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReaderToolbar from '../../src/screens/Reader/ReaderToolbar';
import type { Document } from '../../src/types';
import type { PDFDocumentProxy } from 'pdfjs-dist';

describe('ReaderToolbar Component', () => {
  const mockDoc: Document = {
    id: 'doc-1',
    filePath: 'C:/docs/distributed-systems.pdf',
    fileSizeBytes: 1048576,
    fingerprint: 'test-fingerprint',
    title: 'Distributed Systems Principles',
    author: 'van Steen & Tanenbaum',
    pageCount: 50,
    importStatus: 'ready',
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockPdf = {
    numPages: 50,
  } as unknown as PDFDocumentProxy;

  it('renders document title and page information', () => {
    render(
      <ReaderToolbar
        doc={mockDoc}
        pdf={mockPdf}
        currentPage={4}
        onPageChange={vi.fn()}
        zoom={1.25}
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onZoomFitWidth={vi.fn()}
        onZoomChange={vi.fn()}
        onFocusMode={vi.fn()}
        onBack={vi.fn()}
        hasTextLayer={true}
      />
    );

    expect(screen.getByText('Distributed Systems Principles')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // 0-indexed page 4 is displayed as 5
    expect(screen.getByText('/ 50')).toBeInTheDocument();
    expect(screen.getByText('125%')).toBeInTheDocument();
  });

  it('triggers next and previous page changes', () => {
    const handlePageChange = vi.fn();

    render(
      <ReaderToolbar
        doc={mockDoc}
        pdf={mockPdf}
        currentPage={4}
        onPageChange={handlePageChange}
        zoom={1.0}
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onZoomFitWidth={vi.fn()}
        onZoomChange={vi.fn()}
        onFocusMode={vi.fn()}
        onBack={vi.fn()}
        hasTextLayer={true}
      />
    );

    const prevBtn = screen.getByLabelText(/previous page/i);
    fireEvent.click(prevBtn);
    expect(handlePageChange).toHaveBeenCalledWith(3);

    const nextBtn = screen.getByLabelText(/next page/i);
    fireEvent.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(5);
  });

  it('triggers zoom in and zoom out callbacks', () => {
    const handleZoomIn = vi.fn();
    const handleZoomOut = vi.fn();

    render(
      <ReaderToolbar
        doc={mockDoc}
        pdf={mockPdf}
        currentPage={0}
        onPageChange={vi.fn()}
        zoom={1.0}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomFitWidth={vi.fn()}
        onZoomChange={vi.fn()}
        onFocusMode={vi.fn()}
        onBack={vi.fn()}
        hasTextLayer={true}
      />
    );

    const zoomInBtn = screen.getByLabelText(/zoom in/i);
    fireEvent.click(zoomInBtn);
    expect(handleZoomIn).toHaveBeenCalledTimes(1);

    const zoomOutBtn = screen.getByLabelText(/zoom out/i);
    fireEvent.click(zoomOutBtn);
    expect(handleZoomOut).toHaveBeenCalledTimes(1);
  });
});
