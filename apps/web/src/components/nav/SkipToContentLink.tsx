import { Link } from '@chakra-ui/react';
import { type MouseEvent } from 'react';

export function SkipToContentLink() {
  function focusMainContent(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('#main-content')?.focus();
    });
  }

  return (
    <Link
      bg="blue.700"
      color="white"
      data-skip-link
      fontWeight="bold"
      href="#main-content"
      left={3}
      onClick={focusMainContent}
      p={3}
      position="fixed"
      textDecoration="none"
      top={3}
      transform="translateY(calc(-100% - 1rem))"
      transition="transform 0.1s ease-in-out"
      zIndex="skipLink"
      _focusVisible={{
        boxShadow: 'outline',
        outline: '3px solid',
        outlineColor: 'orange.300',
        outlineOffset: '2px',
        transform: 'translateY(0)',
      }}
    >
      Skip to main content
    </Link>
  );
}
