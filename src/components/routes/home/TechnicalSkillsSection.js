import { TitledSection } from '../../containers/TitledSection';
import { Heading } from '@chakra-ui/react';

export function TechnicalSkillsSection() {
  return <TitledSection title='Technical Skills'>
    <Heading size='md' mb={1}><b>Languages and Markup:</b> Kotlin, Java, JavaScript, C#, SQL, Python</Heading>
    <Heading size='md' mb={1}><b>Databases:</b> RethinkDB, MySQL</Heading>
    <Heading size='md' mb={1}><b>Web development:</b> HTML, CSS, Kotlin/JS (KVision), UIKit, jQuery, React,
      Handlebars.js, Mustache/Handlebars.js, JSP, Spring Boot</Heading>
    <Heading size='md'><b>Development Tools:</b> Git, Gradle, Docker, Docker Compose, Kubernetes, Service Fabric,
      Maven</Heading>
  </TitledSection>;
}