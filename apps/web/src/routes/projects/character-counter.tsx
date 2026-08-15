import {
  Box,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Text,
  Textarea,
} from '@chakra-ui/react';
import { ProjectPage } from '../../components/projects/ProjectPage';
import { useState } from 'react';
import { PageTitle } from '../../components/meta/PageTitle';

function CharacterCounterRoute() {
  const [text, setText] = useState('');

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
      <Box role='status' aria-live='polite' aria-atomic='true'
           px={10} maxW={{ base: '100%', md: '30%' }}>
        <Heading as='h2' size='mdx'>Text information</Heading>
        <Text><b>Characters:</b> {text.length}</Text>
        <Text><b>Words:</b> {countWords(text)}</Text>
      </Box>
    </Flex>

  </ProjectPage>;
}

export function countWords(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue.split(/\s+/u).length : 0;
}

export default CharacterCounterRoute;