import React, { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import ReactTooltip from 'react-tooltip';
import { scaleQuantile } from 'd3-scale';
import { Box, FormControl, FormLabel, Select, SimpleGrid, Text } from '@chakra-ui/react';

const geoUrl =
  'https://raw.githubusercontent.com/zcreativelabs/react-simple-maps/master/topojson-maps/world-110m.json';

type FSINameTypes = {
  [key: string]: string;
};

const fsiNames: FSINameTypes = {
  'Total': 'Total Fragility',
  'C1': 'Security Apparatus',
  'C2': 'Factionalized Elites',
  'C3': 'Group Grievance',
  'E1': 'Economy',
  'E2': 'Economic Inequality',
  'E3': 'Human Flight and Brain Drain',
  'P1': 'State Legitimacy',
  'P2': 'Public Services',
  'P3': 'Human Rights',
  'S1': 'Demographic Pressures',
  'S2': 'Refugees and IDPs',
  'X1': 'External Intervention',
};

export type FSIData = {
  Country: string;
  Total: number;
  Year: number;

  C1: number,
  C2: number;
  C3: number;
  E1: number;
  E2: number;
  E3: number;
  P1: number;
  P2: number;
  P3: number;
  S1: number;
  S2: number;
  X1: number;
}

type FSIMapProps = {
  data: FSIData[];
}

type FSISelectedCategory = 'Total' | 'C1' | 'C2' | 'C3' | 'E1' | 'E2' | 'E3' | 'P1' | 'P2' | 'P3' | 'S1' | 'S2' | 'X1'
const fsiSelectedCategories: string[] = ['Total', 'C1', 'C2', 'C3', 'E1', 'E2', 'E3', 'P1', 'P2', 'P3', 'S1', 'S2', 'X1'];

export function FSIMap({ data }: FSIMapProps) {
  const [selectedCategory, setSelectedCategory] = useState<FSISelectedCategory>('Total');
  // eslint-disable-next-line
  const sortedData = useMemo(() => data.sort((a, b) => a[selectedCategory] - b[selectedCategory]), [selectedCategory]);

  const colorScale = scaleQuantile()
    .domain(data.map(d => d[selectedCategory]))
    .range(
      // @ts-ignore
      [
        '#ffedea',
        '#ffcec5',
        '#ffad9f',
        '#ff8a75',
        '#ff5533',
        '#e2492d',
        '#be3d26',
        '#9a311f',
        '#782618',
      ]);
  const [tooltipContent, setTooltipContent] = useState<string>('');
  return <>
    <ReactTooltip>{tooltipContent}</ReactTooltip>

    <Box>
      <FormControl>
        <FormLabel>Select a fragility type</FormLabel>
        <Select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value as FSISelectedCategory)}
                maxW='500px'>
          {fsiSelectedCategories.map(category => <option value={category}
                                                         key={category}>{fsiNames[category]} ({category})</option>)}
        </Select>
      </FormControl>
    </Box>
    <Box mb={10}>
      <ComposableMap data-tip='' height={500} projectionConfig={{ scale: 200, center: [10, 10] }}>
        <ZoomableGroup>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map(geo => {
                const countryData: FSIData | undefined = sortedData.find(fsiCountryData => fsiCountryData.Country === geo.properties.NAME || fsiCountryData.Country === geo.properties.NAME_LONG);
                const categoryData = countryData ? countryData[selectedCategory] : 'not available';
                return <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={() => {
                    const { NAME } = geo.properties;
                    if (countryData) {
                      setTooltipContent(`${NAME} - ${categoryData} (${sortedData.indexOf(countryData) + 1} of ${sortedData.length})`);
                    }
                  }}
                  onMouseLeave={() => {
                    setTooltipContent('');
                  }}
                  fill={countryData ? (colorScale(countryData[selectedCategory])?.toString() ?? '#EEE') : '#EEE'}
                />;
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </Box>
    <Box mx='auto' mb={20}>
      <SimpleGrid columns={12} spacing={0} mx='auto'>
        <Text>{Math.min(...sortedData.map(data => data[selectedCategory] as number))}</Text>
        {colorScale.quantiles().map((quantile, index) => {
          return <Box h={10} key={quantile}
                      bgColor={colorScale.range()[index] as unknown as string}
                      onMouseEnter={() => setTooltipContent(`Quantile: ${quantile}`)} />;
        })}
        <Text ml={5}>{Math.max(...sortedData.map(data => data[selectedCategory] as number))}</Text>
      </SimpleGrid>
    </Box>
  </>;
}