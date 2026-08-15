import React from 'react';
import { useColorMode, useColorModeValue, IconButton, IconButtonProps } from '@chakra-ui/react';
import { FaMoon, FaSun } from 'react-icons/fa';

export function ColorModeSwitcher(props : IconButtonProps) {
  const { toggleColorMode } = useColorMode();
  const text = useColorModeValue('dark', 'light');
  const SwitchIcon = useColorModeValue(FaMoon, FaSun);

  return (
    <IconButton
      size='md'
      fontSize='lg'
      variant='ghost'
      color='current'
      onClick={toggleColorMode}
      icon={<SwitchIcon />}
      {...props}
      aria-label={`Switch to ${text} mode`}
    />
  );
}
