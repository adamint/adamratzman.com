import { Text } from '@chakra-ui/react';
import { PageTitle } from '../../components/meta/PageTitle';
import { ProjectPage } from '../../components/projects/ProjectPage';

function ArbitraryPrecisionCalculatorRoute() {
  return <ProjectPage projectTitle='Arbitrary Precision Calculator'>
    <PageTitle title="Arbitrary Precision Calculator" />
    <Text>The arbitrary precision calculator will be re-added in the near future. Sorry :(</Text>
  </ProjectPage>;
}

export default ArbitraryPrecisionCalculatorRoute