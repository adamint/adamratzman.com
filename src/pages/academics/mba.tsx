import React from 'react';
import { ProjectPage } from '../../components/projects/ProjectPage';
import { mbaDegree } from '../../components/academics/Degrees';
import Head from 'next/head';
import { AcademicExperience } from '../../components/academics/AcademicExperience';

function MbaDegreePage() {
  return <ProjectPage projectTitle='MBA Degree'>
    <Head>
      <title>My MBA Degree</title>
    </Head>

    <AcademicExperience degree={mbaDegree} />
  </ProjectPage>;
}

export default MbaDegreePage;