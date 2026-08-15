import { Box, Button, Tooltip } from '@chakra-ui/react';
import { useColorModeColor } from './useColorModeColor';
import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

const TOOLTIP_CLOSE_DELAY_MS = 100;

type DashedSpanProps = {
  children: React.ReactNode;
  tooltip?: string;
}

export function DashedSpanWithTooltip({ children, tooltip } : DashedSpanProps) {
  const colorModeColor = useColorModeColor();
  const generatedTooltipId = useId();
  const tooltipContentId = `tooltip-${generatedTooltipId}`;
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const overlayHoveredRef = useRef(false);
  const triggerHoveredRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current === null) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  function openTooltip() {
    clearCloseTimer();
    setIsOpen(true);
  }

  const forceCloseTooltip = useCallback(() => {
    clearCloseTimer();
    overlayHoveredRef.current = false;
    triggerHoveredRef.current = false;
    setIsOpen(false);
  }, [clearCloseTimer]);

  function scheduleClose() {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      if (
        triggerHoveredRef.current
        || overlayHoveredRef.current
        || document.activeElement === triggerRef.current
      ) {
        return;
      }

      setIsOpen(false);
    }, TOOLTIP_CLOSE_DELAY_MS);
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleDocumentKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      forceCloseTooltip();
    }

    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => document.removeEventListener('keydown', handleDocumentKeyDown);
  }, [forceCloseTooltip, isOpen]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  if (!tooltip) return <DashedSpan>{children}</DashedSpan>;

  return <Tooltip
    closeDelay={0}
    closeOnClick={false}
    closeOnEsc={false}
    closeOnPointerDown={false}
    id={generatedTooltipId}
    isOpen={isOpen}
    label={tooltip}
    onClose={scheduleClose}
    onOpen={openTooltip}
    onPointerEnter={() => {
      overlayHoveredRef.current = true;
      openTooltip();
    }}
    onPointerLeave={() => {
      overlayHoveredRef.current = false;
      scheduleClose();
    }}
    openDelay={0}
    pointerEvents='auto'
  >
    <Button
      aria-controls={tooltipContentId}
      aria-expanded={isOpen}
      borderBottom={`1px dashed ${colorModeColor}`}
      borderRadius={0}
      color='inherit'
      display='inline'
      fontFamily='inherit'
      fontSize='inherit'
      fontWeight='inherit'
      height='auto'
      lineHeight='inherit'
      minW={0}
      onBlur={scheduleClose}
      onClick={openTooltip}
      onFocus={openTooltip}
      onKeyDown={event => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        forceCloseTooltip();
      }}
      onPointerEnter={() => {
        triggerHoveredRef.current = true;
        openTooltip();
      }}
      onPointerLeave={() => {
        triggerHoveredRef.current = false;
      }}
      p={0}
      ref={triggerRef}
      textDecoration='none'
      type='button'
      verticalAlign='baseline'
      variant='link'
      _hover={{ textDecoration: 'none' }}
    >
      {children}
    </Button>
  </Tooltip>;
}

export function DashedSpan({ children } : DashedSpanProps) {
  const colorModeColor = useColorModeColor();

  return <Box as='span' borderBottom={`1px dashed ${colorModeColor}`}>
    {children}
  </Box>;

}