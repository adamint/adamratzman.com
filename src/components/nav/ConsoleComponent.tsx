import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  CloseButton,
  HStack,
  Text,
  useBreakpointValue,
  VStack,
} from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import Terminal from 'react-console-emulator';
import { skills } from '../home/TechnicalSkillsSection';
import { currentProjects, pastProjects, Project } from '../../pages/portfolio';


export function ConsoleComponent() {
  const [shouldShow, setShouldShow] = useState<boolean>(false);
  const shouldRenderConsole = useBreakpointValue({ base: false, md: true });

  useEffect(() => {
    setShouldShow(localStorage.getItem('show_console') !== 'false');
  }, []);

  function handleCloseConsole() {
    localStorage.setItem('show_console', 'false');
    setShouldShow(false);
  }


  const commands = {
    job: {
      description: 'See what my current job is',
      fn: () => 'I am a software engineer on the C# Project System team in Microsoft\'s Developer Division. I am based in Seattle, along with my dog Ben.',
    },
    skills: {
      description: 'See what I can do',
      fn: () => `Technologies that I can work with include:\n${Array.from(skills).map(skill => `${skill[0]}: ${skill[1].join(', ')}`).join('\n')}`,
    },
    education: {
      description: 'See what my educational background is',
      fn: () => `I have a Bachelor of Science and Master of Science in Computer Science from Indiana University at Bloomington, obtained in December 2021.`,
    },
    projects: {
      description: 'See past and present projects',
      usage: 'projects <past|present>',
      fn: (type: string) => {
        function printProjects(projects: Project[]) {
          return projects.map(project => `${project.title}: ${project.url}\n${project.description}`).join('\n========\n');
        }

        if (type === 'past') return printProjects(pastProjects);
        else if (type === 'present') return printProjects(currentProjects);
        else return 'Incorrect usage. projects past or present';
      },
    },
    exit: {
      description: 'Hide the console from view',
      fn: () => {
        handleCloseConsole();
        return 'Closing..';
      },
    },
  };

  if (!shouldShow || !shouldRenderConsole) return null;

  return <VStack position='fixed' bottom={0} right={0} width={500} alignItems='unset' bgColor='#212121'>
    <Accordion allowToggle>
      <AccordionItem>
        <HStack w='100%'>
          <CloseButton color='white' onClick={handleCloseConsole} />
          <AccordionButton>
            <Text color='white' fontSize='sm'><b>Interactive site console</b></Text>
            <AccordionIcon color='white' />
          </AccordionButton>
        </HStack>

        <AccordionPanel>
          <Terminal
            welcomeMessage={`Hi, I'm Adam Ratzman. I'm a software engineer at Microsoft.
      Type help to see what commands are available, or type exit to close this`}
            promptLabel='you@adamratzman:~$'
            errorText='Command not found. Please type help to see available commands'
            commands={commands}
            style={{ marginInlineStart: 0, marginTop: 0 }}
            contentStyle={{ padding: 20, paddingTop: 0 }}
          />
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  </VStack>;
}