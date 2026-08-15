import {
  Box,
  Center,
  Flex,
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
import { NavLink } from 'react-router-dom';
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
    icon: <Icon aria-hidden focusable={false} as={FaGithub} w={30} h={30} />,
    notOnSite: true,
    path: 'https://github.com/adamint',
  },
  {
    title: 'Contact Me',
    icon: <Icon aria-hidden focusable={false} as={FaRegPaperPlane} w={30} h={30} />,
    path: '/contact',
  },
];


export function Navbar() {
  const shouldUseDrawer = useBreakpointValue({ base: true, md: false });

  return <Box as="nav" aria-label="Primary navigation">
    {shouldUseDrawer
      ? <MobileNavbar />
      : <Flex mx='auto' w='90%' mt={10} mb={7}>
          <Logo />
          <Spacer />
          <NavbarLinks />
        </Flex>}
  </Box>;
}

function MobileNavbar() {
  const colorModeColor = useColorModeColor();
  const { toggleColorMode } = useColorMode();
  const SwitchIcon = useColorModeValue(FaMoon, FaSun);

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
                      rel="noopener noreferrer"
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
                      as={NavLink}
                      end
                      key={link.path}
                      to={link.path}
                    >
                      <HStack color={colorModeColor}>
                        {link.icon && <Box mx={1}>{link.icon}</Box>}
                        <Text>{link.title}</Text>
                      </HStack>
                    </MenuItem>
                  ))}
              <MenuItem onClick={toggleColorMode}>
                <Box as="span" mr={1}>Switch theme</Box>
                <SwitchIcon aria-hidden focusable={false} />
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
    <Link as={NavLink} color={colorModeColor} variant="navigation" to="/">
      <Box
        as="span"
        fontFamily="'Rubik', sans-serif"
        fontSize="md"
        fontWeight={700}
        lineHeight={1.2}
      >
        Adam Ratzman
      </Box>
    </Link>
  </Center>;
}

function NavbarLinks() {
  const colorModeColor = useColorModeColor();

  const innerLinkContent = (link: NavbarLink) => <HStack>
    {link.icon && <Box mx={1}>{link.icon}</Box>}
    <Box
      as="span"
      fontFamily="'Rubik', sans-serif"
      fontSize="md"
      fontWeight={500}
      lineHeight={1.2}
    >
      {link.title}
    </Box>
  </HStack>;

  return <HStack>
    <HStack spacing={8}>
      {navbarLinks.map(link => <Box key={link.path}>
        {link.notOnSite
          ? (
              <Link
                color={colorModeColor}
                href={link.path}
                rel="noopener noreferrer"
                target="_blank"
                variant="navigation"
              >
                {innerLinkContent(link)}
              </Link>
            )
          : (
              <Link as={NavLink} color={colorModeColor} end variant="navigation" to={link.path}>
                {innerLinkContent(link)}
              </Link>
            )}
      </Box>)}
    </HStack>
    <ColorModeSwitcher aria-label='Color mode switcher button' />
  </HStack>;
}