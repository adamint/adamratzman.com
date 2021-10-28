import { Box, Flex, Heading, Spacer, Spinner } from '@chakra-ui/react';
import { ChakraRouterLink } from '../utils/ChakraRouterLink';
import React from 'react';

type ProjectPageProps = {
  projectTitle: string | React.ReactElement;
  children: React.ReactNode;
  topRight?: React.ReactElement;
  descriptionOverride?: string | React.ReactElement;
  isLoading?: boolean;
  marginBelowHeadingOverride?: number
}

export function ProjectPage({
                              projectTitle,
                              children,
                              topRight,
                              descriptionOverride,
                              isLoading = false,
                              marginBelowHeadingOverride,
                            }: ProjectPageProps) {
  return <>
    <Flex mb={5}>
      <Box>
        <Heading fontSize='2.5rem' variant='semiLight'
                 mb={marginBelowHeadingOverride ? marginBelowHeadingOverride : 2}>{projectTitle}</Heading>
        <Heading size='md' variant='light'>{descriptionOverride ? descriptionOverride : <>Not what you&apos;re looking for?
          Go back to the <ChakraRouterLink href='/projects'>projects page →</ChakraRouterLink></>}</Heading>
      </Box>
      <Spacer />
      <Box>
        <Box mb={3}>{topRight}</Box>
        {isLoading && <Spinner size='lg' color='blue.500' float='right' />}
      </Box>
    </Flex>
    <Box>
      {children}
    </Box>
  </>;
}