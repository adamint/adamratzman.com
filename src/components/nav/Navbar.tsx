import {
  Box,
  Center,
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
  useColorMode,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaGithub, FaRegPaperPlane } from 'react-icons/fa';
import { ColorModeSwitcher } from '../../ColorModeSwitcher';
import { useColorModeColor } from '../utils/useColorModeColor';
import { HamburgerIcon } from '@chakra-ui/icons';
import React, { ReactElement } from 'react';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import { FaMoon, FaSun } from 'react-icons/fa';

interface NavbarLink {
  title: string;
  path: string;
  icon?: ReactElement;
  notOnSite?: boolean;
}

const navbarLinks: NavbarLink[] = [
  { title: 'Online Projects', path: '/projects' },
  { title: 'Portfolio', path: '/portfolio' },
  { title: 'Education', path: '/academics' },
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
  const router = useRouter();
  const { toggleColorMode } = useColorMode();
  const SwitchIcon = useColorModeValue(FaMoon, FaSun);

  async function handleMenuItemClicked(link: NavbarLink) {
    if (link.notOnSite) window.open(link.path);
    else await router.push(link.path);
  }

  return <>
    <Flex mx='auto' w='90%' mt={4}>
      <Logo />
      <Spacer />

      <Menu>
        {({ isOpen }) => (
          <>
            <MenuButton isActive={isOpen} as={IconButton} icon={<HamburgerIcon />} />
            <MenuList p={2}>
              {navbarLinks.map(link => <MenuItem key={link.path} onClick={async () => handleMenuItemClicked(link)}>
                <Link as={link.notOnSite ? Link : NextLink} href={link.path} color={colorModeColor}>
                  <HStack>
                    {link.icon && <Box mx={1}>{link.icon}</Box>}
                    <Text>
                      {link.title}
                    </Text>
                  </HStack>
                </Link>
              </MenuItem>)}
              <MenuItem onClick={toggleColorMode}>
                <>Switch theme {<SwitchIcon />}</>
              </MenuItem>
            </MenuList>
          </>
        )}
      </Menu>
    </Flex>
  </>;
}

function Logo() {
  const colorModeColor = useColorModeColor();

  return <Center>
    <Link as={NextLink} href='/' color={colorModeColor}>
        <Heading size='sm' fontWeight={700} fontFamily="'Rubik', sans-serif">Adam Ratzman</Heading>
    </Link>
  </Center>;
}

function NavbarLinks() {
  const colorModeColor = useColorModeColor();

  const innerLinkContent = (link: NavbarLink) => <HStack>
    {link.icon && <Box mx={1}>{link.icon}</Box>}
    <Heading size='sm' fontWeight={500} fontFamily="'Rubik', sans-serif">
      {link.title}
    </Heading>
  </HStack>;

  return <HStack>
    <HStack spacing={8}>
      {navbarLinks.map(link => <Box key={link.path}>
        {link.notOnSite ?
          <Link href={link.path} color={colorModeColor}>{innerLinkContent(link)}</Link> :
          <Link as={NextLink} href={link.path} color={colorModeColor}>{innerLinkContent(link)}</Link>}
      </Box>)}
    </HStack>
    <ColorModeSwitcher aria-label='Color mode switcher button' />
  </HStack>;
}