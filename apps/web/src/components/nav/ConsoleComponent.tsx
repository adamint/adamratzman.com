import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { skills } from '../home/TechnicalSkillsSection';
import {
  currentProjects,
  pastProjects,
  type Project,
} from '../../routes/portfolio';

const DESKTOP_CONSOLE_QUERY = '(min-width: 48em)';
const UNKNOWN_COMMAND_OUTPUT =
  'Command not found. Please type help to see available commands';
const PROJECT_USAGE_OUTPUT = 'Incorrect usage. projects past or present';
const HELP_OUTPUT = [
  'Available commands:',
  'job - See what my current job is',
  'skills - See what I can do',
  'education - See what my educational background is',
  'projects <past|present> - See past and present projects',
  'exit - Hide the console from view',
  'help - List available commands',
].join('\n');

export const CONSOLE_CONTROL_COLORS = {
  light: {
    primary: {
      background: 'blue.700',
      border: 'blue.900',
      foreground: 'white',
      hoverBackground: 'blue.800',
    },
    secondary: {
      background: 'white',
      border: 'gray.300',
      foreground: 'gray.900',
      hoverBackground: 'gray.100',
    },
  },
  dark: {
    primary: {
      background: 'blue.300',
      border: 'blue.50',
      foreground: 'gray.900',
      hoverBackground: 'blue.200',
    },
    secondary: {
      background: 'gray.100',
      border: 'gray.300',
      foreground: 'gray.900',
      hoverBackground: 'white',
    },
  },
} as const;

type ConsoleCommandResult = {
  output: string;
  shouldClose: boolean;
};

type ConsoleHistoryEntry = {
  command: string;
  output: string;
};

export function executeConsoleCommand(
  commandLine: string,
): ConsoleCommandResult | null {
  const normalizedCommandLine = commandLine.trim();
  if (!normalizedCommandLine) return null;

  const [command, ...argumentsList] = normalizedCommandLine.split(/\s+/u);

  switch (command) {
    case 'job':
      return commandResult(
        'I am a software engineer on the C# Project System team in Microsoft\'s Developer Division. I am based in Seattle, along with my dog Ben.',
      );
    case 'skills':
      return commandResult(
        `Technologies that I can work with include:\n${Array.from(skills)
          .map(([category, entries]) => `${category}: ${entries.join(', ')}`)
          .join('\n')}`,
      );
    case 'education':
      return commandResult(
        'I have a Bachelor of Science and Master of Science in Computer Science from Indiana University at Bloomington, obtained in December 2021.',
      );
    case 'projects':
      if (argumentsList.length !== 1) {
        return commandResult(PROJECT_USAGE_OUTPUT);
      }

      if (argumentsList[0] === 'past') {
        return commandResult(formatProjects(pastProjects));
      }

      if (argumentsList[0] === 'present') {
        return commandResult(formatProjects(currentProjects));
      }

      return commandResult(PROJECT_USAGE_OUTPUT);
    case 'exit':
      return {
        output: 'Closing..',
        shouldClose: true,
      };
    case 'help':
      return commandResult(HELP_OUTPUT);
    default:
      return commandResult(UNKNOWN_COMMAND_OUTPUT);
  }
}

export function ConsoleComponent() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [commandLine, setCommandLine] = useState('');
  const [history, setHistory] = useState<ConsoleHistoryEntry[]>([]);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const panelBackground = useColorModeValue('gray.900', 'gray.800');
  const panelBorder = useColorModeValue('gray.700', 'gray.600');
  const primaryControlColors = useColorModeValue(
    CONSOLE_CONTROL_COLORS.light.primary,
    CONSOLE_CONTROL_COLORS.dark.primary,
  );
  const secondaryControlColors = useColorModeValue(
    CONSOLE_CONTROL_COLORS.light.secondary,
    CONSOLE_CONTROL_COLORS.dark.secondary,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_CONSOLE_QUERY);

    function updateDesktopState() {
      setIsDesktop(mediaQuery.matches);
      if (mediaQuery.matches) {
        setIsOpen(currentValue => (
          currentValue ?? localStorage.getItem('show_console') !== 'false'
        ));
      }
    }

    updateDesktopState();
    mediaQuery.addEventListener('change', updateDesktopState);
    return () => mediaQuery.removeEventListener('change', updateDesktopState);
  }, []);

  function openConsole() {
    const openingTrigger = openButtonRef.current;
    localStorage.setItem('show_console', 'true');
    setIsOpen(true);
    window.requestAnimationFrame(() => {
      const activeElement = document.activeElement;
      if (
        activeElement === document.body
        || activeElement === openingTrigger
        || !activeElement?.isConnected
      ) {
        commandInputRef.current?.focus();
      }
    });
  }

  function closeConsole() {
    localStorage.setItem('show_console', 'false');
    setIsOpen(false);
    window.requestAnimationFrame(() => openButtonRef.current?.focus());
  }

  function runCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCommandLine = commandLine.trim();
    const result = executeConsoleCommand(normalizedCommandLine);
    if (!result) return;

    setHistory(currentHistory => [
      ...currentHistory,
      {
        command: normalizedCommandLine,
        output: result.output,
      },
    ]);
    setCommandLine('');

    if (result.shouldClose) {
      closeConsole();
    }
  }

  if (isDesktop !== true || isOpen === null) return null;

  if (!isOpen) {
    return (
      <Button
        _hover={{ bg: primaryControlColors.hoverBackground }}
        bg={primaryControlColors.background}
        bottom={4}
        borderColor={primaryControlColors.border}
        borderWidth="1px"
        color={primaryControlColors.foreground}
        onClick={openConsole}
        position="fixed"
        ref={openButtonRef}
        right={4}
        size="sm"
        zIndex="overlay"
      >
        Open interactive site console
      </Button>
    );
  }

  return (
    <Box
      aria-label="Interactive site console"
      as="section"
      bg={panelBackground}
      borderColor={panelBorder}
      borderRadius="md"
      borderWidth="1px"
      bottom={4}
      boxShadow="xl"
      color="white"
      maxH="min(32rem, calc(100vh - 2rem))"
      overflowY="auto"
      p={4}
      position="fixed"
      right={4}
      role="region"
      w="min(32rem, calc(100vw - 2rem))"
      zIndex="overlay"
    >
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between">
          <Heading as="h2" size="sm">
            Interactive site console
          </Heading>
          <Button
            _hover={{ bg: secondaryControlColors.hoverBackground }}
            bg={secondaryControlColors.background}
            borderColor={secondaryControlColors.border}
            borderWidth="1px"
            color={secondaryControlColors.foreground}
            onClick={closeConsole}
            size="xs"
          >
            Close interactive site console
          </Button>
        </HStack>

        <Text fontSize="sm">
          Type help to see available commands, or exit to close the console.
        </Text>

        <Box
          aria-label="Console output"
          aria-live="polite"
          bg="blackAlpha.400"
          borderRadius="sm"
          minH="5rem"
          p={3}
          role="log"
        >
          <VStack align="stretch" spacing={3}>
            {history.map((entry, index) => (
              <Box key={`${index}-${entry.command}`}>
                <Text fontFamily="mono" fontSize="sm" whiteSpace="pre-wrap">
                  {`> ${entry.command}`}
                </Text>
                <Text fontFamily="mono" fontSize="sm" whiteSpace="pre-wrap">
                  {entry.output}
                </Text>
              </Box>
            ))}
          </VStack>
        </Box>

        <Box as="form" onSubmit={runCommand}>
          <HStack align="end">
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>
                Console command
              </FormLabel>
              <Input
                autoComplete="off"
                bg="white"
                color="gray.900"
                onChange={event => setCommandLine(event.target.value)}
                ref={commandInputRef}
                size="sm"
                value={commandLine}
              />
            </FormControl>
            <Button
              _hover={{ bg: primaryControlColors.hoverBackground }}
              bg={primaryControlColors.background}
              borderColor={primaryControlColors.border}
              borderWidth="1px"
              color={primaryControlColors.foreground}
              flexShrink={0}
              size="sm"
              type="submit"
            >
              Run command
            </Button>
          </HStack>
        </Box>
      </VStack>
    </Box>
  );
}

function commandResult(output: string): ConsoleCommandResult {
  return {
    output,
    shouldClose: false,
  };
}

function formatProjects(projects: Project[]) {
  return projects
    .map(project => `${project.title}: ${project.url}\n${project.description}`)
    .join('\n========\n');
}
