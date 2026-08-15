import React from 'react';
import { ProjectPage } from '../../components/projects/ProjectPage';
import { bachelorsDegree } from '../../components/academics/Degrees';
import Head from 'next/head';
import { AcademicExperience } from '../../components/academics/AcademicExperience';

function BachelorsDegreePage() {
  return <ProjectPage projectTitle="Bachelor's Degree"
                      descriptionOverride={<>I graduated from Indiana University in December 2021 with this degree.</>}
  >
    <Head>
      <title>My Bachelor&apos;s Degree</title>
    </Head>

    <AcademicExperience degree={bachelorsDegree} />
  </ProjectPage>;
}

export default BachelorsDegreePage;