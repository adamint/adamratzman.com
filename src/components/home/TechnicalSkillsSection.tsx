import { TitledSection } from '../containers/TitledSection';
import { Box, Heading, Icon, Text } from '@chakra-ui/react';
import { SiChakraui, SiReact, SiTypescript } from 'react-icons/all';
import { ChakraRouterLink } from '../utils/ChakraRouterLink';

export const skills: Map<string, string[]> = new Map([
  ['Languages and Markup', ['Kotlin', 'Java', 'JavaScript', 'TypeScript', 'C#', 'SQL', 'Python']],
  ['Databases', ['MySQL', 'RethinkDB']],
  ['Web Development', ['HTML', 'CSS', 'React', 'Kotlin/JS', 'Handlebars/Mustache.js', 'JSP', 'Spring Boot']],
  ['Development Tools', ['Git', 'Gradle', 'Docker', 'Docker Compose', 'Kubernetes', 'Service Fabric', 'Maven']],
]);

export function TechnicalSkillsSection() {
  return <TitledSection title='Technical Skills'>
    <Box mb={3}>
      {Array.from(skills.entries()).map((entry) => <Heading size='md' mb={1} key={entry[0]}><b>{entry[0]}:</b> {entry[1].join(", ")}</Heading>)}
    </Box>
    <Text>This website was <ChakraRouterLink target='_blank'
                                             href='https://github.com/adamint/adamratzman.com'>developed</ChakraRouterLink> using
      TypeScript <Icon as={SiTypescript} /><Box as='span' mr={1}>,</Box> React <Icon as={SiReact} />
      <Box as='span' mr={1}>,</Box> and Chakra UI <Icon as={SiChakraui} />.</Text>
  </TitledSection>;
}