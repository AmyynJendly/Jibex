import type { ReactNode } from 'react';

export interface FaqListProps {
  /** The contact card shown above the questions. */
  header: ReactNode;
  sectionTitle: string;
  faqs: { question: string; answer: string }[];
}
