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
import { FaMoon, FaSun } from 'react-icons/fa';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ColorModeSwitcher } from '../../ColorModeSwitcher';
import { useColorModeColor } from '../utils/useColorModeColor';
import { HamburgerIcon } from '@chakra-ui/icons';
import { type ReactElement } from 'react';

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
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleColorMode } = useColorMode();
  const SwitchIcon = useColorModeValue(FaMoon, FaSun);

  function handleMenuItemClicked(link: NavbarLink) {
    void navigate(link.path);
  }

  return <>
    <Flex mx='auto' w='90%' mt={4}>
      <Logo />
      <Spacer />

      <Menu>
        {({ isOpen }) => (
          <>
            <MenuButton
              aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
              as={IconButton}
              icon={<HamburgerIcon />}
              isActive={isOpen}
            />
            <MenuList p={2}>
              {navbarLinks.map(link => link.notOnSite
                ? (
                    <MenuItem
                      as="a"
                      href={link.path}
                      key={link.path}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <HStack color={colorModeColor}>
                        {link.icon && <Box mx={1}>{link.icon}</Box>}
                        <Text>{link.title}</Text>
                      </HStack>
                    </MenuItem>
                  )
                : (
                    <MenuItem
                      aria-current={location.pathname === link.path ? 'page' : undefined}
                      key={link.path}
                      onClick={() => handleMenuItemClicked(link)}
                    >
                      <HStack color={colorModeColor}>
                        {link.icon && <Box mx={1}>{link.icon}</Box>}
                        <Text>{link.title}</Text>
                      </HStack>
                    </MenuItem>
                  ))}
              <MenuItem onClick={toggleColorMode}>
                <Box as="span" mr={1}>Switch theme</Box>
                <SwitchIcon />
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
    <Link as={NavLink} color={colorModeColor} to="/">
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
        {link.notOnSite
          ? (
              <Link
                color={colorModeColor}
                href={link.path}
                rel="noreferrer"
                target="_blank"
              >
                {innerLinkContent(link)}
              </Link>
            )
          : (
              <Link as={NavLink} color={colorModeColor} to={link.path}>
                {innerLinkContent(link)}
              </Link>
            )}
      </Box>)}
    </HStack>
    <ColorModeSwitcher aria-label='Color mode switcher button' />
  </HStack>;
}