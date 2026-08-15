import { Box, Button, Tooltip } from '@chakra-ui/react';
import { useColorModeColor } from './useColorModeColor';
import React from 'react';

type DashedSpanProps = {
  children: React.ReactNode;
  tooltip?: string;
}

export function DashedSpanWithTooltip({ children, tooltip } : DashedSpanProps) {
  const colorModeColor = useColorModeColor();

  if (!tooltip) return <DashedSpan>{children}</DashedSpan>;

  return <Tooltip label={tooltip}>
    <Button
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
      p={0}
      textDecoration='none'
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