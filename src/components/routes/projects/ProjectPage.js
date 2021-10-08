import { Box, Flex, Heading, Spacer, Spinner } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../utils/ChakraRouterLink';

export function ProjectPage({
                              projectTitle,
                              children,
                              topRight = null,
                              descriptionOverride = null,
                              isLoading = false,
                            }) {
  return <>
    <Flex mb={5}>
      <Box>
        <Heading fontSize='2.5rem' variant='semiLight' mb={2}>{projectTitle}</Heading>
        <Heading size='md' variant='light'>{descriptionOverride ? descriptionOverride : <>Not what you're looking for?
          Go back to the <ChakraRouterLink to='/projects'>projects page →</ChakraRouterLink></>}</Heading>
      </Box>
      <Spacer />
      <Box>
        <Box mb={3}>{topRight}</Box>
        {isLoading && <Spinner size='lg' color='blue.500' float="right" />}
      </Box>
    </Flex>
    <Box>
      {children}
    </Box>
  </>;
}