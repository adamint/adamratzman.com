import { Box, Center, HStack, Icon, Link, Text } from '@chakra-ui/react';
import { BiEnvelope, FaLinkedinIn, FiGithub } from 'react-icons/all';
import { useColorModeColor } from '../utils/useColorModeColor';

export function Footer() {
  return <Box my={5}>
    <Center mb={2}>
      <HStack spacing={2} color='gray.600' textAlign='center'>
        <FooterLink icon={FaLinkedinIn} link='https://linkedin.com/in/aratzman' />
        <FooterLink icon={FiGithub} link='https://github.com/adamint' />
        <FooterLink icon={BiEnvelope} link='mailto:adam@adamratzman.com' />
      </HStack>
    </Center>

    <Text textAlign='center'>Adam Ratzman - &copy; 2021</Text>
  </Box>;
}

type FooterLinkProps = {
  icon: any;
  link: string
}

function FooterLink({ icon, link }: FooterLinkProps) {
  const colorModeColor = useColorModeColor();

  return <Link href={link} color={colorModeColor}>
    <Icon as={icon} w={25} h={25} />
  </Link>;
}