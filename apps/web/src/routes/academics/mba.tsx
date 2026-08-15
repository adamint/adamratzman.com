import React from 'react';
import { ProjectPage } from '../../components/projects/ProjectPage';
import { mbaDegree } from '../../components/academics/Degrees';
import { PageTitle } from '../../components/meta/PageTitle';
import { AcademicExperience } from '../../components/academics/AcademicExperience';

function MbaDegreePage() {
  return <ProjectPage projectTitle='MBA Degree'>
    <PageTitle title="My MBA Degree" />

    <AcademicExperience degree={mbaDegree} />
  </ProjectPage>;
}

export default MbaDegreePage;