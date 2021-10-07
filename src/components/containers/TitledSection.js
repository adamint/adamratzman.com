import { Box, Heading } from '@chakra-ui/react';
import { useColorModeColor } from '../text/useColorModeColor';

export function TitledSection({ title, children, ...rest }) {
  const colorModeColor = useColorModeColor();

  return <Box my={5} {...rest}>
    <Heading size='mdx' w='100%' borderBottom={`1px solid ${colorModeColor}`} mb={2} pb={0.5}>{title}</Heading>
    {children}
  </Box>;
}