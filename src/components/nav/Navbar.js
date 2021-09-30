import { Box, Flex, Heading, HStack, Icon, Link, Spacer } from '@chakra-ui/react';
import { FaGithub, FaRegPaperPlane } from 'react-icons/all';
import { Link as RouterLink } from 'react-router-dom';

export function Navbar() {
  return <Flex mx='auto' w='90%' mt={10}>
    <Logo />
    <Spacer />
    <NavbarLinks />
  </Flex>;
}

function Logo() {
  return <RouterLink to='/'>
    <Heading size='sm' fontWeight={700}>Adam Ratzman</Heading>
  </RouterLink>;
}

function NavbarLinks() {
  const links = [
    { title: 'Online Projects', path: '/projects' },
    { title: 'Portfolio', path: '/portfolio' },
    { title: 'Blog', path: '/blog' },
    {
      title: 'GitHub',
      icon: <Icon as={FaGithub} w={30} h={30} />,
      notOnSite: true,
      path: 'https://github.com/adamint',
    },
    {
      title: 'Contact Me',
      icon: <Icon as={FaRegPaperPlane} w={30} h={30} />,
      path: '/contact',
    },
  ];

  return <HStack spacing={8}>
    {links.map(link => <Box key={link.path}>
      <Link as={link.notOnSite ? Link : RouterLink} to={link.path} href={link.path}>
        <HStack>
          {link.icon && <Box mx={1}>{link.icon}</Box>}
          <Heading size='sm'>
            {link.title}
          </Heading>
        </HStack>
      </Link>
    </Box>)}
  </HStack>;
}