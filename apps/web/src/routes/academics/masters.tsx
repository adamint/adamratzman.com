import React from 'react';
import { ProjectPage } from '../../components/projects/ProjectPage';
import { mastersDegree } from '../../components/academics/Degrees';
import { PageTitle } from '../../components/meta/PageTitle';
import { AcademicExperience } from '../../components/academics/AcademicExperience';

function MastersDegreePage() {
  return <ProjectPage projectTitle="Master's Degree"
                      descriptionOverride={<>I graduated from Indiana University in December 2021 with this degree.</>}
  >
    <PageTitle title="My Master's Degree" />

    <AcademicExperience degree={mastersDegree} />
  </ProjectPage>;
}

export default MastersDegreePage;