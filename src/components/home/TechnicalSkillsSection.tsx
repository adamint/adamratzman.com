import { TitledSection } from '../containers/TitledSection';
import { Box, Heading, Icon, Text } from '@chakra-ui/react';
import { SiChakraui, SiReact, SiTypescript } from 'react-icons/all';
import { ChakraRouterLink } from '../utils/ChakraRouterLink';

export function TechnicalSkillsSection() {
  return <TitledSection title='Technical Skills'>
    <Box mb={3}>
      <Heading size='md' mb={1}><b>Languages and Markup:</b> Kotlin, Java, JavaScript, TypeScript, C#, SQL,
        Python</Heading>
      <Heading size='md' mb={1}><b>Databases:</b> RethinkDB, MySQL</Heading>
      <Heading size='md' mb={1}><b>Web development:</b> HTML, CSS, Kotlin/JS (KVision), UIKit, jQuery, React,
        Handlebars.js, Mustache/Handlebars.js, JSP, Spring Boot</Heading>
      <Heading size='md'><b>Development Tools:</b> Git, Gradle, Docker, Docker Compose, Kubernetes, Service Fabric,
        Maven</Heading>
    </Box>
    <Text>This website was <ChakraRouterLink target='_blank'
                                             href='https://github.com/adamint/adamratzman.com'>developed</ChakraRouterLink> using
      TypeScript <Icon as={SiTypescript} /><Box as='span' mr={1}>,</Box> React <Icon as={SiReact} />
      <Box as='span' mr={1}>,</Box> and Chakra UI <Icon as={SiChakraui} />.</Text>
  </TitledSection>;
}