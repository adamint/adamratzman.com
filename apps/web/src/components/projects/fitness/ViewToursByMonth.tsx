import { Fragment } from 'react';
import { SportType, useToursByMonth } from '../../utils/useKomootData';
import { Box, HStack, Spinner, Text } from '@chakra-ui/react';
import { metersToMiles } from './FitnessUtils';

export function ViewToursByMonthComponent() {
  const currentMonthRequest = useToursByMonth({ offset: 0, limit: 1 });

  if (currentMonthRequest.error) {
    return <Text aria-live='polite' role='status'>
      Monthly activity is temporarily unavailable.
    </Text>;
  }

  const currentMonthResponse = currentMonthRequest.data;
  if (currentMonthRequest.isLoading || !currentMonthResponse) return <HStack
    aria-live='polite'
    role='status'
  >
    <Text fontSize='md'>Loading activities...</Text>
    <Spinner />
  </HStack>;

  const currentMonthData = currentMonthResponse.data[0];
  if (!currentMonthData) {
    return <Text aria-live='polite' role='status'>
      No activities recorded this month.
    </Text>;
  }

  const currentMonthTravelElements = Object.entries(currentMonthData.distanceBySportType)
    .sort((a, b) => -a[0].localeCompare(b[0]))
    .map(entry => <Fragment key={entry[0]}>{displayName(entry[0] as SportType)} <b>{metersToMiles(entry[1]).toFixed(0)}</b> miles</Fragment>);

  return <Box>
    <Text fontSize='md'>So far this month, I have {currentMonthTravelElements.map((element, index) => <Fragment key={index}>
      {index !== 0 && ', '}
      {index === currentMonthTravelElements.length - 1 && " and " }
      {element}
    </Fragment>)}.
    </Text>
  </Box>;
}

function displayName(sportType: SportType) {
  if (sportType == 'Biking') return "biked"
  else if (sportType == "EBiking") return "e-biked"
  else if (sportType == "Running") return "ran"
  else if (sportType == "Hiking") return "hiked"
  else if (sportType == "Other") return "done other activities a total of"
}