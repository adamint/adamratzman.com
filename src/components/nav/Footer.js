import { Center, HStack, Icon } from '@chakra-ui/react';
import { FaLinkedinIn } from 'react-icons/all';

export function Footer() {
  return <Center>
    <HStack spacing={5}>
      <Icon as={FaLinkedinIn} w={25} h={25} />
    </HStack>
  </Center>;
}