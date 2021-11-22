import { Step, Steps, useSteps } from 'chakra-ui-steps';
import { ProjectPage } from '../../../components/projects/ProjectPage';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { router } from 'next/client';
import { BiHeart } from 'react-icons/all';

function SlideshowPage() {
  const { prevStep, nextStep, activeStep } = useSteps({
    initialStep: 0,
  });

  return <ProjectPage projectTitle='Dear Eveline'
                      descriptionOverride="Let's dispel the idea that you're not special...">
    <Steps activeStep={activeStep}>
      {steps.map(({ label, content }) => (
        <Step label={label} key={label}>
          <Box mt={3}>{content}</Box>
        </Step>
      ))}
    </Steps>

    <Flex width='100%' justify='flex-end' mt={10}>
      <Button
        mr={4}
        size='sm'
        variant='ghost'
        onClick={prevStep}
        isDisabled={activeStep === 0}
      >
        Previous page
      </Button>
      <Button size='sm' onClick={nextStep}>
        I accept that this point is correct
      </Button>
    </Flex>
  </ProjectPage>;
}

export default SlideshowPage;

const steps = [
  {
    label: 'Intelligence',
    content: <>
      <Text fontSize='lg'>One of the sexiest things about you is your intelligence. You're witty, funny, and I've never
        met anyone who
        can
        banter as well as you. You keep people on their toes (I promise that was accidental),
        and you're the smartest person in the room [at least when it's just the two of us :)].
        <br />
        You also have incredible emotional intelligence. You always knew what to say to make me feel better.</Text>
    </>,
  },
  {
    label: 'Beauty', content: <>
      <Text fontSize='lg'>You're immaculate - just so incredibly beautiful. Everyone has some flaws, but it's hard to
        find any on you. Why do you think I always wanted to see you?</Text>
    </>,
  },
  {
    label: 'Talent and Drive', content: <>
      <Text fontSize='lg'>One of the things that made you an inspiration was your drive, work ethic, and talent. No one else I've met
      would have been able to juggle a full-time job, full-time school, and research and clubs and still have time for walks and hikes.
      You're determined to get what you want, and you do what you need to in order to get there. That's an admirable, really rare quality.</Text>
    </>,
  },
  {
    label: 'Conclusion', content: <>
      <Text fontSize='lg'>You're perfect. You're special. You're unique. If you'd like to see this in longform, send me
        a text and I'll write out a
        long paragraph for you. I'm sorry the execution of this idea was bad, it seemed a lot better in my head
        :(</Text>
      <Button mt={3} colorScheme="red" onClick={async () => await router.push('/projects/eveline/affirmations')}>Please click here for a
        surprise <BiHeart /></Button>
    </>,
  },
];
