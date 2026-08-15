import {
  Box,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Text,
  Textarea,
  VisuallyHidden,
} from '@chakra-ui/react';
import { ProjectPage } from '../../components/projects/ProjectPage';
import { useEffect, useState } from 'react';
import { PageTitle } from '../../components/meta/PageTitle';

function CharacterCounterRoute() {
  const [text, setText] = useState('');
  const [announcement, setAnnouncement] = useState(
    formatCountAnnouncement(0, 0),
  );
  const wordCount = countWords(text);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAnnouncement(formatCountAnnouncement(text.length, wordCount));
    }, 500);

    return () => window.clearTimeout(timer);
  }, [text, wordCount]);

  return <ProjectPage projectTitle='Character Counter' isLoading={false}>
    <PageTitle title="Character counter" />
    <Heading as='h2' size='mdx' variant='semiLight' mb={2}>Enter your text...</Heading>
    <Flex>
      <FormControl maxW={{ base: '100%', lg: '70%' }}>
        <FormLabel htmlFor='text-to-analyze'>Text to analyze</FormLabel>
        <Textarea id='text-to-analyze'
                  rows={10}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder='Enter the text that you want to analyze here.' />
      </FormControl>
      <Box px={10} maxW={{ base: '100%', md: '30%' }}>
        <Heading as='h2' size='mdx'>Text information</Heading>
        <Text><b>Characters:</b> {text.length}</Text>
        <Text><b>Words:</b> {wordCount}</Text>
      </Box>
    </Flex>
    <VisuallyHidden role='status' aria-live='polite' aria-atomic='true'>
      {announcement}
    </VisuallyHidden>

  </ProjectPage>;
}

export function countWords(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue.split(/\s+/u).length : 0;
}

function formatCountAnnouncement(characters: number, words: number) {
  return `${characters} ${characters === 1 ? 'character' : 'characters'}, `
    + `${words} ${words === 1 ? 'word' : 'words'}.`;
}

export default CharacterCounterRoute;