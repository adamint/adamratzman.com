import { useColorMode } from '@chakra-ui/react';

export function useColorModeColor() {
  const { colorMode } = useColorMode()
  return colorMode === "light" ? "black" : "white"
}