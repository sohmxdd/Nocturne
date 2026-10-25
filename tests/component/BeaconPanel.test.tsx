import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BeaconPanel from '../../src/screens/Beacon/BeaconPanel';
import { AppProvider } from '../../src/context/AppContext';
import type { Document } from '../../src/types';

describe('BeaconPanel Component', () => {
  const mockDoc: Document = {
    id: 'doc-ai-test',
    filePath: 'C:/docs/paper.pdf',
    fileSizeBytes: 2048576,
    fingerprint: 'fp-1234',
    title: 'Research Paper',
    author: 'Author Name',
    pageCount: 20,
    importStatus: 'ready',
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('renders beacon drawer with title, active page context, and quick actions', () => {
    const handleClose = vi.fn();

    render(
      <AppProvider>
        <BeaconPanel
          documentId={mockDoc.id}
          currentPage={2}
          selectedText="Transformers replace recurrent neural networks"
          onClose={handleClose}
          doc={mockDoc}
        />
      </AppProvider>
    );

    expect(screen.getByText('Context Beacon')).toBeInTheDocument();
    expect(screen.getByText('Active on Page 3')).toBeInTheDocument();
    expect(
      screen.getByText('“Transformers replace recurrent neural networks”')
    ).toBeInTheDocument();

    const closeBtn = screen.getByLabelText(/close beacon/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('switches between beacon modes (Explain, Summarize, Quiz, Ask Anything)', () => {
    render(
      <AppProvider>
        <BeaconPanel
          documentId={mockDoc.id}
          currentPage={0}
          selectedText={null}
          onClose={vi.fn()}
          doc={mockDoc}
        />
      </AppProvider>
    );

    const quizTab = screen.getByRole('tab', { name: /quiz/i });
    expect(quizTab).toBeInTheDocument();
    fireEvent.click(quizTab);
    expect(quizTab).toHaveAttribute('aria-selected', 'true');
  });
});
