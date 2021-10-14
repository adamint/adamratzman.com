import { Box, Heading, Link, Text } from '@chakra-ui/react';
import { TitledSection } from '../containers/TitledSection';
import { TechnicalSkillsSection } from './home/TechnicalSkillsSection';
import { DashedSpan } from '../utils/DashedSpan';
import { useDocumentTitle } from '../utils/useDocumentTitle';

export function ContactRoute() {
  useDocumentTitle("Contact Me")

  return <>
    <Box mb={10}>
      <Heading fontSize='2.5rem' variant='light' mb={3}>So, you'd like to contact me. Here's how.</Heading>
      <Text variant='bold'>Recruiters, you may be interested in my <Link href='https://linkedin.com/in/aratzman'>LinkedIn
        →</Link></Text>
    </Box>

    <TitledSection title='Personal/Professional Inquiries' pb={5}>
      <Text mb={2}>My skills include application and web development, as well as DevOps and technical writing.
        I am currently <DashedSpan>not open</DashedSpan> to considering job and/or business opportunities in these
        fields.</Text>
      <Text>Please contact me by email at <Link
        href='mailto:adam@adamratzman.com'><b>adam@adamratzman.com</b></Link>.</Text>
    </TitledSection>

    <TechnicalSkillsSection />
  </>;
}
