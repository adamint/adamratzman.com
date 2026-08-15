import React from 'react';
import { ProjectPage } from '../../components/projects/ProjectPage';
import { mastersDegree } from '../../components/academics/Degrees';
import Head from 'next/head';
import { AcademicExperience } from '../../components/academics/AcademicExperience';

function MastersDegreePage() {
  return <ProjectPage projectTitle="Master's Degree"
                      descriptionOverride={<>I graduated from Indiana University in December 2021 with this degree.</>}
  >
    <Head>
      <title>My Master&apos;s Degree</title>
    </Head>

    <AcademicExperience degree={mastersDegree} />
  </ProjectPage>;
}

export default MastersDegreePage;