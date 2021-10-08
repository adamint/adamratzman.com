import { Box } from '@chakra-ui/react';
import { useColorModeColor } from './useColorModeColor';

export function DashedSpan({ children }) {
  const colorModeColor = useColorModeColor()

  return <Box as='span' borderBottom={`1px dashed ${colorModeColor}`}>{children}</Box>;
}