import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { Box, FormControl, FormLabel, HStack, Select, Spinner } from '@chakra-ui/react';
import { FSIData, FSIMap } from './FSIMap';
import { ProjectPage } from '../../ProjectPage';

type FSIYear =
  2006
  | 2007
  | 2008
  | 2009
  | 2010
  | 2011
  | 2012
  | 2013
  | 2014
  | 2015
  | 2016
  | 2017
  | 2018
  | 2019
  | 2020
  | 2021
const fsiYears: FSIYear[] = [2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021];

export function FSIViewer() {
  const [csvData, setCsvData] = useState<FSIData[] | null>(null);
  const [fsiYear, setFsiYear] = useState<FSIYear>(2021);

  useEffect(() => {
    (async () => {
      const response = await fetch(`/fsi/fsi-${fsiYear}.csv`);
      if (!response?.body) return null;
      const reader = response.body.getReader();
      const result = await reader.read();
      const decoder = new TextDecoder('utf-8');
      const csv = decoder.decode(result.value);
      const results = Papa.parse(csv, { header: true }).data;
      const fsiCountryData: FSIData[] = results.map((result: any) => {
        return {
          Country: result['Country'] as string,
          Year: parseInt(result['Year']),
          Total: parseFloat(result['Total']),
          C1: parseFloat(result['C1: Security Apparatus']),
          C2: parseFloat(result['C2: Factionalized Elites']),
          C3: parseFloat(result['C3: Group Grievance']),
          E1: parseFloat(result['E1: Economy']),
          E2: parseFloat(result['E2: Economic Inequality']),
          E3: parseFloat(result['E3: Human Flight and Brain Drain']),
          P1: parseFloat(result['P1: State Legitimacy']),
          P2: parseFloat(result['P2: Public Services']),
          P3: parseFloat(result['P3: Human Rights']),
          S1: parseFloat(result['S1: Demographic Pressures']),
          S2: parseFloat(result['S2: Refugees and IDPs']),
          X1: parseFloat(result['X1: External Intervention']),
        };
      });

      setCsvData(fsiCountryData);

    })();
  }, [fsiYear]);

  if (!csvData) return <HStack>
    Loading... <Spinner />
  </HStack>;

  return <ProjectPage projectTitle={`Fragile States Index (${fsiYear})`}>
    <Box mb={5}>

      <FormControl>
        <FormLabel>Year</FormLabel>
        <Select value={fsiYear} onChange={e => setFsiYear(parseInt(e.target.value) as FSIYear)} maxW='200px'>
          {fsiYears.map(year => <option value={year} key={year}>{year}</option>)}
        </Select>
      </FormControl>
    </Box>

    <FSIMap data={csvData} />
  </ProjectPage>;
}