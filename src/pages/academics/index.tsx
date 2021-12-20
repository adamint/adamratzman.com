import React from 'react';
import { ProjectPage } from '../../components/projects/ProjectPage';
import { IuTridentIcon } from '../../components/icons/IuTridentIcon';
import { Box, Heading, Text } from '@chakra-ui/react';
import { Degree } from '../../components/academics/Degree';
import { bachelorsDegree, mastersDegree } from '../../components/academics/Degrees';
import { ChakraRouterLink } from '../../components/utils/ChakraRouterLink';
import Head from 'next/head';

function AcademicsPage() {
  return <ProjectPage projectTitle='Academics'
                      descriptionOverride={<>I graduated from Indiana University Bloomington <IuTridentIcon /> in
                        December 2021 with a Master&apos;s and Bachelor&apos;s degree in Computer Science.</>}
  >
    <Head>
      <title>My education</title>
    </Head>

    <Heading size='lg' mb={4}>My degrees</Heading>
    <EducationBox degree={bachelorsDegree} path='/academics/bachelors' />
    <EducationBox degree={mastersDegree} path='/academics/masters' />
  </ProjectPage>;
}

type EducationBoxProps = {
  degree: Degree;
  path: string;
}

function EducationBox({ degree, path }: EducationBoxProps) {
  return <Box mb={2}>
    <Heading size='md'>
      <ChakraRouterLink href={path}>
        <span>{degree.degreeKind} in {degree.degreeField}</span>
      </ChakraRouterLink>
    </Heading>
    <Text>{degree.startedDegree} - {degree.finishedDegree}</Text>
  </Box>;
}

export default AcademicsPage;