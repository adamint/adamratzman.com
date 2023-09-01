import { Fragment, useState } from 'react';
import { SportType, useToursByMonth } from '../../utils/useKomootData';
import { Box, HStack, Spinner, Text, Tooltip } from '@chakra-ui/react';
import { metersToMiles } from './FitnessUtils';
import { DashedSpanWithTooltip } from '../../utils/DashedSpanWithTooltip';

const carbonEmissionPercentageSavedTooltip = "Assumptions: 1) 8,000 miles driven per year, 2) all bike trips *replace* a car one, 3) I have already offset the combined carbon cost of all of my bikes."

export function ViewToursByMonthComponent() {
  const [offset, setOffset] = useState<number>(0);
  const currentMonthResponse = useToursByMonth({ offset: 0, limit: 1 });

  const limit = 3;
  const response = useToursByMonth({ offset, limit });

  if (!currentMonthResponse?.data || !response?.data) return <HStack>
    <Text fontSize='md'>Loading activities...</Text>
    <Spinner />
  </HStack>;

  const currentMonthData = currentMonthResponse.data[0];
  const currentMonthTravelElements = Object.entries(currentMonthData.distanceBySportType)
    .sort((a, b) => -a[0].localeCompare(b[0]))
    .map(entry => <Fragment key={entry[0]}>{displayName(entry[0] as SportType)} <b>{metersToMiles(entry[1]).toFixed(0)}</b> miles</Fragment>);

  // each ebike/bike mile vs car reduces my carbon footprint by ~0.5 lbs
  const annualTransportationCarbonEmissions = 3500

  const ebikeAndBikeMileDistance = metersToMiles((currentMonthData.distanceBySportType['EBiking'] ?? 0) + (currentMonthData.distanceBySportType['Biking'] ?? 0))
  const carbonEmissionsSavedThisMonth = ebikeAndBikeMileDistance * 0.5
  const carbonEmissionPercentageSaved = Math.min(100, carbonEmissionsSavedThisMonth / (annualTransportationCarbonEmissions / 12) * 100)

  return <Box>
    <Text fontSize='md'>So far this month, I have {currentMonthTravelElements.map((element, index) => <Fragment key={index}>
      {index !== 0 && ', '}
      {index === currentMonthTravelElements.length - 1 && " and " }
      {element}
    </Fragment>)}.</Text>
    <Text fontSize="md">I have also reduced my transportation carbon footprint by <DashedSpanWithTooltip tooltip={carbonEmissionPercentageSavedTooltip}><Box as="span"><b>{carbonEmissionPercentageSaved.toFixed(0)}</b>%</Box></DashedSpanWithTooltip>.</Text>
  </Box>;
}

function displayName(sportType: SportType) {
  if (sportType == 'Biking') return "biked"
  else if (sportType == "EBiking") return "e-biked"
  else if (sportType == "Running") return "ran"
  else if (sportType == "Hiking") return "hiked"
  else if (sportType == "Other") return "???"
}