import { useDocumentTitle } from '../../../utils/useDocumentTitle';
import { Box, Flex, Heading, Text, Textarea } from '@chakra-ui/react';
import { ProjectPage } from '../ProjectPage';
import { useState } from 'react';

export function CharacterCounterRoute() {
  useDocumentTitle('Character counter');
  const [text, setText] = useState('');

  return <ProjectPage projectTitle='Character Counter' isLoading={false}>
    <Heading size='mdx' variant='semiLight' mb={2}>Enter your text...</Heading>
    <Flex>
      <Textarea rows={10} maxW={{ base: '100%', lg: '70%' }}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder='Enter the text that you want to analyze here.' />
      <Box px={10} maxW={{ base: '100%', md: '30%' }}>
        <Heading size='mdx'>Text information</Heading>
        <Text><b>Characters:</b> {text.length}</Text>
        <Text><b>Words:</b> {text.length === 0 ? 0 : text.split(' ').length}</Text>
      </Box>
    </Flex>

  </ProjectPage>;
}