import { Box, Tooltip } from '@chakra-ui/react';
import { useColorModeColor } from './useColorModeColor';
import React from 'react';

type DashedSpanProps = {
  children: React.ReactNode;
  tooltip?: string;
}

export function DashedSpan({ children, tooltip } : DashedSpanProps) {
  const colorModeColor = useColorModeColor();

  return <Box as='span' borderBottom={`1px dashed ${colorModeColor}`}>
    {tooltip ? <Tooltip label={tooltip}>{children}</Tooltip> : children}
  </Box>;
}