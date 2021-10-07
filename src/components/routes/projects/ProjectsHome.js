import { Box, Heading, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../text/ChakraRouterLink';


export function ProjectsHomeRoute() {
  return <>
    <Box mb={5}>
      <Heading fontSize='2.5rem' variant='semiLight' mb={3}>Projects</Heading>
      <Heading size='lg' variant='light'>An incomplete list of online projects and utilities I've created.</Heading>
    </Box>


    <ProjectCategory title='spotify'>
      <Project title='Generate Spotify OAuth Token'
               link='/projects/spotify/generate-token'
               description='Quickly and easily generate a Spotify OAuth Token to use in spotify-web-api-kotlin' />

      <Project title='My Top Tracks and Artists'
               link='/projects/spotify/mytop'
               description='See what your short, medium, and long-term Spotify top tracks and artists are' />

      <Project title='Spotify Category List'
               link='/projects/spotify/categories'
               description='See all available Spotify categories' />

      <Project title='Spotify Genre List'
               link='/projects/spotify/genres/list'
               description='See all available Spotify genres' />

      <Project title='Spotify Playlist Creator'
               link='/projects/spotify/recommend'
               description='Allows you to create a Spotify playlist specifically tailored to your tastes' />
    </ProjectCategory>

    <ProjectCategory title='school'>
      <Project title='AP Calculus Interactive Review Site'
               link='http://ap-calculus-review-sohalski.herokuapp.com/'
               description='A comprehensive review site for calculus theorems, derivatives, and integrals, with options to test yourself with randomly-generated relevant problems' />
    </ProjectCategory>

    <ProjectCategory title='utilities'>
      <Project title='Arbitrary Precision Calculator'
               link='/projects/calculator'
               description={<span>For when you need <b>really</b> big numbers</span>} />

      <Project title='Base Converter'
               link='/projects/conversion/base-converter'
               description='Easily convert between different base systems' />
    </ProjectCategory>

  </>;
}

function ProjectCategory({ title, children }) {
  return <Box mb={5}>
    <Heading size='xl' variant='semiLight' mb={2}>{title}</Heading>
    {children}
  </Box>;
}

function Project({ title, link, description }) {
  return <Box mb={2}>
    <Text fontSize='xl'><ChakraRouterLink to={link}>{title}</ChakraRouterLink></Text>
    <Text fontSize='md'>{description}</Text>
  </Box>;
}