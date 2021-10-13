import {
  Box, Center,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spacer,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';
import { FaGithub, FaRegPaperPlane } from 'react-icons/all';
import { Link as RouterLink } from 'react-router-dom';
import { ColorModeSwitcher } from '../../ColorModeSwitcher';
import { useColorModeColor } from '../utils/useColorModeColor';
import { HamburgerIcon } from '@chakra-ui/icons';

const navbarLinks = [
  { title: 'Online Projects', path: '/projects' },
  { title: 'Portfolio', path: '/portfolio' },
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


export function Navbar() {
  const shouldUseDrawer = useBreakpointValue({ base: true, md: false });

  if (shouldUseDrawer) {
    return <MobileNavbar />;
  } else {
    return <Flex mx='auto' w='90%' mt={10} mb={7}>
      <Logo />
      <Spacer />
      <NavbarLinks />
    </Flex>;
  }
}

function MobileNavbar() {
  const colorModeColor = useColorModeColor();
  return <>
    <Flex mx='auto' w='90%' mt={4}>
      <Logo />
      <Spacer />

      <Menu>
        {({ isOpen }) => (
          <>
            <MenuButton isActive={isOpen} as={IconButton} icon={<HamburgerIcon />} />
            <MenuList p={2}>
              {navbarLinks.map(link => <MenuItem key={link.path}>
                <Link as={link.notOnSite ? Link : RouterLink} to={link.path} href={link.path} color={colorModeColor}>
                  <HStack>
                    {link.icon && <Box mx={1}>{link.icon}</Box>}
                    <Text>
                      {link.title}
                    </Text>
                  </HStack>
                </Link>
              </MenuItem>)}
            </MenuList>
          </>
        )}
      </Menu>
    </Flex>
  </>;
}

function Logo() {
  return <Center><RouterLink to='/'>
    <Heading size='sm' fontWeight={700} fontFamily="'Rubik', sans-serif">Adam Ratzman</Heading>
  </RouterLink></Center>;
}

function NavbarLinks() {
  const colorModeColor = useColorModeColor();

  return <HStack>
    <HStack spacing={8}>
      {navbarLinks.map(link => <Box key={link.path}>
        <Link as={link.notOnSite ? Link : RouterLink} to={link.path} href={link.path} color={colorModeColor}>
          <HStack>
            {link.icon && <Box mx={1}>{link.icon}</Box>}
            <Heading size='sm' fontWeight={500} fontFamily="'Rubik', sans-serif">
              {link.title}
            </Heading>
          </HStack>
        </Link>
      </Box>)}
    </HStack>
    <ColorModeSwitcher />
  </HStack>;
}