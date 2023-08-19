import { Box, Tooltip } from '@chakra-ui/react';
import { useColorModeColor } from './useColorModeColor';
import React from 'react';

type DashedSpanProps = {
  children: React.ReactNode;
  tooltip?: string;
}

export function DashedSpanWithTooltip({ children, tooltip } : DashedSpanProps) {
  return <DashedSpan tooltip={tooltip}>
    {tooltip ? <Tooltip label={tooltip}>{children}</Tooltip> : children}
  </DashedSpan>;
}

export function DashedSpan({children} : DashedSpanProps) {
  const colorModeColor = useColorModeColor();

  return <Box as='span' borderBottom={`1px dashed ${colorModeColor}`}>
    {children}
  </Box>;

}