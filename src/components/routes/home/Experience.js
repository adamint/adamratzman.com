import { Box, Flex, Heading, ListItem, Spacer, UnorderedList } from '@chakra-ui/react';

export function Experience({
                             place,
                             title,
                             date,
                             additionalRightSideContext = null,
                             location = null,
                             bullets = null,
                           }) {
  return <Box mb={5}>
    <Flex>
      <Box mb={1}>
        <Heading variant='light' size='md'>
          <b>{place}</b>{location && <>, {location}</>}
        </Heading>
        <Heading variant='light' size='md'>
          <i>{title}</i>
        </Heading>
      </Box>
      <Spacer />
      <Box textAlign='right'>
        <Heading variant='light' size='md'>{date}</Heading>
        {additionalRightSideContext && <Heading variant='light' size='md'>{additionalRightSideContext}</Heading>}
      </Box>
    </Flex>
    {bullets && bullets.length > 0 && <Box>
      <UnorderedList ml='4em'>
        {bullets.map((bullet, index) => <ListItem key={index} fontSize={17}>{bullet}</ListItem>)}
      </UnorderedList>
    </Box>}
  </Box>;
}