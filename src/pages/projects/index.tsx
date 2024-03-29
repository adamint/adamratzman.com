import { Box, Heading, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../components/utils/ChakraRouterLink';
import { ProjectPage } from '../../components/projects/ProjectPage';
import React from 'react';
import Head from 'next/head';

function ProjectsHomeRoute() {
  return <ProjectPage projectTitle='Projects'
                      descriptionOverride="An incomplete list of online projects and utilities I've created.">
    <Head>
      <title>My Projects</title>
    </Head>

    <ProjectCategory title='school'>
      <Project title='Academic record'
               link='/academics'
               description='View my BS, MS, and MBA degree class records.' />

      <Project title='AP Calculus Interactive Review Site'
               link='http://ap-calculus-review-sohalski.herokuapp.com/'
               description='A comprehensive review site for calculus theorems, derivatives, and integrals, with options to test yourself with randomly-generated relevant problems' />
    </ProjectCategory>

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

    <ProjectCategory title='utilities'>
      <Project title='Base Converter'
               link='/projects/conversion/base-converter'
               description='Easily convert between different base systems' />

      <Project title='Character counter'
               link='/projects/character-counter'
               description='Small project with a character and word counter' />

      <Project title='Arbitrary Precision Calculator'
               link='/projects/calculator'
               description={<span>For when you need <b>really</b> big numbers</span>} />
    </ProjectCategory>
  </ProjectPage>;
}

type ProjectCategoryProps = {
  title: string;
  children: React.ReactNode
}

function ProjectCategory({ title, children }: ProjectCategoryProps) {
  return <Box mb={5}>
    <Heading size='xl' variant='semiLight' mb={2}>{title}</Heading>
    {children}
  </Box>;
}

type ProjectProps = {
  title: string | React.ReactElement;
  link: string;
  description: string | React.ReactElement
}

function Project({ title, link, description }: ProjectProps) {
  return <Box mb={2}>
    <Text fontSize='xl'><ChakraRouterLink href={link}>{title}</ChakraRouterLink></Text>
    <Text fontSize='md'>{description}</Text>
  </Box>;
}

export default ProjectsHomeRoute;