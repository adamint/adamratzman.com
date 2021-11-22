import { ProjectPage } from '../../../components/projects/ProjectPage';
import { useState } from 'react';
import {
  Button,
  Heading,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
  useInterval,
  useToast,
} from '@chakra-ui/react';
import { MicrosoftIcon } from '../../../components/icons/MicrosoftIcon';
import { RandomReveal } from 'react-random-reveal';

function AffirmationsPage() {
  const [nextAffirmationIn, setNextAffirmationIn] = useState<number>(10000);
  const [affirmation, setAffirmation] = useState(getRandomAffirmation());
  const [greeting, setGreeting] = useState(getRandomElement(greetings));
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  useInterval(() => {
    if (nextAffirmationIn <= 1000) {
      setAffirmation(getRandomAffirmation());
      setGreeting(getRandomElement(greetings));
      setNextAffirmationIn(10000);
    } else setNextAffirmationIn(old => old - 1000);
  }, 1000);

  return <ProjectPage projectTitle='Affirmations'
                      descriptionOverride="A little reminder that you're still perfect."
                      topRight={<>
                        <Text fontSize='md'>Next affirmation in: {nextAffirmationIn / 1000} seconds</Text>
                        <Text fontSize='md'>Click <Link onClick={onOpen}>here</Link> if you&apos;re getting sappy</Text>
                      </>}>
    <Heading size='lg' mb={3}>Hey {greeting},</Heading>
    <Text size='lg'>{affirmation}</Text>

    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Note to you</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text>When it&apos;s time to meet again, if you ever feel ready, don&apos;t be afraid to bring you as you are, not just
            your best self. I&apos;ll be there for you, through anything.</Text>
        </ModalBody>

        <ModalFooter>
          <Button variant='ghost' mr={3} onClick={onClose}>
            Close
          </Button>
          <Button colorScheme='blue' onClick={() => toast({
            title: 'Send me a text to do that, silly <3',
            status: "error"
          })}>Request another gift from me</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  </ProjectPage>;
}

export default AffirmationsPage;

const affirmations = [
  'You killed undergrad, even in a pandemic, and completed it a year early',
  'You\'re the most beautiful girl that I\'ve ever seen',
  'Your smile and laugh would melt anyone\'s heart',
  'You\'re strong, independent, driven, and so sexy',
  <>You were so smart that Microsoft just had to have you {<MicrosoftIcon />}</>,
  'Your road-trip game is incredibly strong',
  'You\'re kind, caring, sweet, and gentle',
  'You bring out the best in people. You certainly brought out the best in me',
  'You\'re the best hiking and running partner anyone could ask for',
  'You look hella good in leggings',
  'You deserve happiness and peace',
  'You\'re worthy of love and self-love',
  <RandomReveal
    isPlaying
    duration={4.6}
    revealDuration={0.5}
    characters="You're cute"
    key="cute"
  />,
  'You have so much beauty inside of you',
  'I hope you learn how fucking amazing you are',
];

const greetings = [
  'beautiful',
  'gorgeous',
  'sexy',
  'perfect',
  'you',
  'babe',
  'cutie',
];

function getRandomAffirmation() {
  return getRandomElement(affirmations);
}

function getRandomElement(items: any[]) {
  return items[Math.floor(Math.random() * items.length)];
}