import { Box, BoxProps, Heading, Spacer, Spinner, Text } from '@chakra-ui/react';
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
                              ...rest
                            }: ProjectPageProps & BoxProps) {
  return <Box {...rest}>
    <Box mb={5}>
      <Box>
        <Heading as='h1' fontSize='2.5rem' variant='semiLight'
                 mb={marginBelowHeadingOverride ? marginBelowHeadingOverride : 2}>{projectTitle}</Heading>
        <Text fontSize='xl' variant='light'>{descriptionOverride ? descriptionOverride : <>Not what you&apos;re looking
          for?
          Go back to the <ChakraRouterLink href='/projects'>projects page →</ChakraRouterLink></>}</Text>
      </Box>
      <Spacer />
      <Box>
        {topRight && <Box my={3}>{topRight}</Box>}
        {isLoading && <Spinner size='lg' color='blue.500' float='right' />}
      </Box>
    </Box>
    <Box>
      {children}
    </Box>
  </Box>;
}