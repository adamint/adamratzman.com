import React from 'react';
import { ProjectPage } from '../../components/projects/ProjectPage';
import { IuTridentIcon } from '../../components/icons/IuTridentIcon';
import { Box, Heading, Text } from '@chakra-ui/react';
import { Degree } from '../../components/academics/Degree';
import NextLink from 'next/link';
import { bachelorsDegree, mastersDegree } from '../../components/academics/Degrees';
import { ChakraRouterLink } from '../../components/utils/ChakraRouterLink';
import Head from 'next/head';
import { AcademicExperience } from '../../components/academics/AcademicExperience';

function BachelorsDegreePage() {
  return <ProjectPage projectTitle="Master's Degree"
                      descriptionOverride={<>I am graduating December 18 from Indiana University <IuTridentIcon /> with this degree.</>}
  >
    <Head>
      <title>My Master&apos;s Degree</title>
    </Head>

    <AcademicExperience degree={mastersDegree} />
  </ProjectPage>;
}

export default BachelorsDegreePage;