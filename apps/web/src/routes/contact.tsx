import { Box, Heading, Link, Text } from '@chakra-ui/react';
import { TitledSection } from '../components/containers/TitledSection';
import { TechnicalSkillsSection } from '../components/home/TechnicalSkillsSection';
import { DashedSpanWithTooltip } from '../components/utils/DashedSpanWithTooltip';
import { PageTitle } from '../components/meta/PageTitle';

function ContactRoute() {
  return <>
    <PageTitle title="Contact Me" />

    <Box mb={10}>
      <Heading as='h1' fontSize='2.5rem' variant='light' mb={3}>So, you&apos;d like to contact me. Here&apos;s how.</Heading>
      <Text variant='bold'>Recruiters, you may be interested in my <Link href='https://linkedin.com/in/aratzman'>LinkedIn
        →</Link></Text>
    </Box>

    <TitledSection title='Personal/Professional Inquiries' pb={5}>
      <Text mb={2}>My skills include application and web development, as well as DevOps and technical writing.
        I am currently <DashedSpanWithTooltip>not open</DashedSpanWithTooltip> to considering job and/or business opportunities in these
        fields.</Text>
      <Text>Please contact me by email at <Link
        href='mailto:adam@adamratzman.com'><b>adam@adamratzman.com</b></Link>.</Text>
    </TitledSection>

    <TechnicalSkillsSection />
  </>;
}

export default ContactRoute;