import React, { useMemo, useState } from 'react';
import { Pair, SportType, useActivityStatsByWeek, WeekMonthYearPair } from '../../utils/useKomootData';
import { AxisOptions, Chart } from 'react-charts';
import { Box, Text } from '@chakra-ui/react';
import { DashedSpan } from '../../utils/DashedSpanWithTooltip';
import { ChakraRouterLink } from '../../utils/ChakraRouterLink';
import { useColorModeColor } from '../../utils/useColorModeColor';
import { metersToMiles, Pagination } from './FitnessUtils';

type Series = {
  label: string,
  data: Pair<WeekMonthYearPair, number>[]
}

export function ViewActivityByWeek() {
  const colorModeColor = useColorModeColor();

  const [offset, setOffset] = useState<number>(0);
  const limit = 6;

  const response = useActivityStatsByWeek({ offset, limit });

  const primaryAxis = useMemo(
    (): AxisOptions<Pair<WeekMonthYearPair, number>> => ({
      getValue: datum => `${datum.first.weekStartMonth}/${datum.first.weekStartDay} - ${datum.first.weekEndMonth}/${datum.first.weekEndDay}`,
    }),
    [],
  );

  const secondaryAxes = useMemo(
    (): AxisOptions<Pair<WeekMonthYearPair, number>>[] => [
      {
        getValue: datum => metersToMiles(datum.second),
        elementType: 'area',
        max: response?.data ? Math.max(120, ...response?.data?.flatMap(s => Object.values(s.second).map(meters => metersToMiles(meters)) as number[])) : 120,
        showGrid: true,
        formatters: {
          cursor: (value: number) => `${value?.toFixed(2)} miles`,
          tooltip: (value: number) => `${value?.toFixed(2)} miles`,
        },
      },
    ],
    [],
  );

  if (response === null) return;

  const data = response.data.reverse();
  const sportTypes: SportType[] = ['Biking', 'EBiking', 'Running', 'Other'];
  const allSeries: Series[] = Array.from(sportTypes).map(sportType => {
    return {
      label: sportType,
      data: data.map(weekData => {
        return {
          first: weekData.first,
          second: weekData.second[sportType] || 0,
        };
      }),
    };
  });

  const backendMicroserviceGithubLink = 'https://github.com/adamint/adamratzman-backend-microservice/blob/main/src/main/kotlin/com/adamratzman/api/komoot/KomootExternalApi.kt#L63';

  return <Pagination next={response.next}
                     nextText='Back in time'
                     previous={response.previous}
                     previousText='Further in time'
                     switchPreviousAndNext={true}
                     setOffset={setOffset}
                     setLimit={() => {
                     }}
                     mb={5}
  >
    <Box>
      <Box mb={2}>
        <Text fontSize='md'>Activity by week (includes biking & running).</Text>
        <Text fontSize='sm'>Data from Komoot, aggregation done by <ChakraRouterLink
          href={backendMicroserviceGithubLink}><DashedSpan>myself</DashedSpan></ChakraRouterLink></Text>
      </Box>

      <Box h={220}>
        <Chart
          options={{
            data: allSeries,
            primaryAxis,
            secondaryAxes,
            dark: colorModeColor === 'white',
          }}
        />
      </Box>
    </Box>
  </Pagination>;
}