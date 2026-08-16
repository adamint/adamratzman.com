import React, { useState } from 'react';
import { SportType, useActivityStatsByWeek } from '../../utils/useKomootData';
import {
  Box,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { DashedSpan } from '../../utils/DashedSpanWithTooltip';
import { ChakraRouterLink } from '../../utils/ChakraRouterLink';
import { metersToMiles, Pagination } from './FitnessUtils';

export function ViewActivityByWeek() {
  const [offset, setOffset] = useState<number>(0);
  const limit = 6;

  const response = useActivityStatsByWeek({ offset, limit });

  if (response === null) return;

  const data = [...response.data].reverse();
  const sportTypes: SportType[] = [
    'Biking',
    'EBiking',
    'Running',
    'Hiking',
    'Other',
  ];

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
        <Text fontSize='md'>Activity by week, split by sport.</Text>
        <Text fontSize='sm'>Data from Komoot, aggregation done by <ChakraRouterLink
          href={backendMicroserviceGithubLink}><DashedSpan>myself</DashedSpan></ChakraRouterLink></Text>
      </Box>

      <TableContainer
        aria-label='Weekly activity distance table'
        overflowX='auto'
        role='region'
        tabIndex={0}
      >
        <Table
          aria-label='Weekly activity distance in miles'
          size='sm'
          variant='simple'
        >
          <Thead>
            <Tr>
              <Th>Week</Th>
              {sportTypes.map(sportType => (
                <Th key={sportType} isNumeric>{sportType}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {data.map(weekData => (
              <Tr key={[
                weekData.first.year,
                weekData.first.weekStartMonth,
                weekData.first.weekStartDay,
              ].join('-')}>
                <Td whiteSpace='nowrap'>
                  {weekData.first.weekStartMonth}/{weekData.first.weekStartDay}
                  {' - '}
                  {weekData.first.weekEndMonth}/{weekData.first.weekEndDay},
                  {' '}
                  {weekData.first.year}
                </Td>
                {sportTypes.map(sportType => (
                  <Td key={sportType} isNumeric>
                    {metersToMiles(weekData.second[sportType] || 0).toFixed(2)}
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  </Pagination>;
}