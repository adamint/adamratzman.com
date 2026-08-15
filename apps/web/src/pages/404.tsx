import { AspectRatio, Box, Center, Heading, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../components/utils/ChakraRouterLink';
import randomColor from 'randomcolor';
import Head from 'next/head';

type NotFoundRouteProps = {
  goBackPathName?: string;
  goBackPath?: string;
}

function NotFoundRoute({ goBackPathName, goBackPath }: NotFoundRouteProps) {
  const backgroundColor = randomColor({ luminosity: 'light' });

  return <>
    <Head>
      <title>404 Not Found</title>
    </Head>
    <Center mb={5} py={15} backgroundColor={backgroundColor}>
      <Box>
        <Box mb={10}>
          <Heading fontSize='2.5rem' variant='light' mb={1}>Oh no, that page wasn&apos;t found.</Heading>
          <Text variant='bold'>{(goBackPath && goBackPathName) ? <>Maybe try going back to <ChakraRouterLink
            href={goBackPath}>{goBackPathName}</ChakraRouterLink>?</> : <>Looks like you need some help:</>}</Text>
        </Box>
        <AspectRatio maxW='560px' ratio={1.5}>
          <iframe
            title='Rick Astley'
            src='https://www.youtube.com/embed/dQw4w9WgXcQ'
            allowFullScreen
          />
        </AspectRatio>
      </Box>

    </Center>

  </>;
}

export default NotFoundRoute;