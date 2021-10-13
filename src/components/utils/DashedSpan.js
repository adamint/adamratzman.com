import { Box, Tooltip } from '@chakra-ui/react';
import { useColorModeColor } from './useColorModeColor';

export function DashedSpan({ children, tooltip = null }) {
  const colorModeColor = useColorModeColor();

  return <Box as='span' borderBottom={`1px dashed ${colorModeColor}`}>
    {tooltip ? <Tooltip label={tooltip}>{children}</Tooltip> : children}
  </Box>;
}