import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = `Adam Ratzman | ${title}`;
  }, [title]);
}
