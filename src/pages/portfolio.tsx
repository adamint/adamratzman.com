import { Box, Heading, Link, Text } from '@chakra-ui/react';
import { TitledSection } from '../components/containers/TitledSection';
import { TechnicalSkillsSection } from '../components/home/TechnicalSkillsSection';
import React from 'react';
import { BoxProps } from '@chakra-ui/layout/dist/types/box';
import Head from 'next/head';

const currentProjects = [
  {
    title: 'Spotify Kotlin Wrapper',
    url: 'https://github.com/adamint/spotify-web-api-kotlin',
    description: 'A wrapper around the Spotify Web API, written in Kotlin',
    categories: ['Kotlin', 'Kotlin multiplatform project (MPP)', 'HTTP', 'API'],
  },
  {
    title: 'adamratzman.com',
    url: 'https://adamratzman.com',
    description: 'This site. I\'m currently working on updating it with useful interactive projects!',
    categories: ['JavaScript', 'TypeScript', 'React', 'HTTP', 'CSS'],
  },
];

const pastProjects = [
  {
    title: 'AP Calculus Review Site',
    url: 'http://ap-calculus-review-sohalski.herokuapp.com/',
    description: 'A comprehensive review site for calculus theorems, derivatives, and integrals',
    categories: ['Handlebars', 'CSS', 'JavaScript', 'Kotlin', 'LaTEX'],
  },
  {
    title: 'Project Euler Kotlin',
    url: 'https://github.com/adamint/project-euler-kotlin',
    description: 'Solutions to the first ~60 Project Euler problems, all implemented with Kotlin',
    categories: ['Competitions', 'Kotlin'],
  },
  {
    title: 'Ardent',
    url: 'https://github.com/ArdentDevelopers/Ardent-2018',
    description: '(Discontinued) An open-source, fast, stylish, and modern Discord game engine & administration tool',
    categories: ['Discord', 'Website', 'Bot', 'Kotlin', 'JavaScript'],
  },
  {
    title: 'Octagonapp',
    url: 'https://github.com/adamint/octagonapp',
    description: 'A comprehensive review site for calculus theorems, derivatives, and integrals',
    categories: ['Aggregator', 'API', 'Kotlin'],
  },
];


function PortfolioRoute() {
  return <>
    <Head>
      <title>My Portfolio</title>
    </Head>
    <Box mb={10}>
      <Heading fontSize='2.5rem' variant='light' mb={3}>Here are just some of the things I&apos;ve done.</Heading>
    </Box>

    <TitledSection title='Selected Projects' pb={5}>
      <Box mb={15}>
        <Heading size='mdx' variant='light' mb={2}>current projects</Heading>
        {currentProjects.map(project => <PortfolioProject key={project.title}
                                                          title={project.title}
                                                          url={project.url}
                                                          description={project.description}
                                                          categories={project.categories} />)}
      </Box>
      <Box>
        <Heading size='mdx' variant='light' mb={2}>past projects</Heading>
        {pastProjects.map(project => <PortfolioProject key={project.title}
                                                       title={project.title}
                                                       url={project.url}
                                                       description={project.description}
                                                       categories={project.categories} />)}
      </Box>
    </TitledSection>

    <TechnicalSkillsSection />
  </>;
}

type PortfolioRouteProps = {
  title: string | React.ReactElement;
  url: string;
  description: string;
  categories: string[]
}

function PortfolioProject({ title, url, description, categories, ...rest }: PortfolioRouteProps & BoxProps) {
  return <Box {...rest} mb={3}>
    <Heading size='md' variant='semibold'><Link href={url}>{title}</Link></Heading>
    <Text fontSize={17}>{description}</Text>
    <Text fontSize={17}><b>Categories: </b> {categories.join(', ')}</Text>
  </Box>;
}

export default PortfolioRoute;
