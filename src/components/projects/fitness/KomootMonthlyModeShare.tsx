import { Tour, useKomootData } from '../../utils/useKomootData';
import { Box, Spinner, Tooltip } from '@chakra-ui/react';
import { Tooltip as RechartsTooltip, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import ColorHash from 'color-hash'

const colorHash = new ColorHash({lightness: 0.49});

export function KomootMonthlyModeShare() {
  const komootData = useKomootData();

  if (!komootData) return <Box>Loading... <Spinner /></Box>;

  const tours = komootData.sortedTours
    .filter(tour => {
      const date = new Date(Date.parse(tour.date))
      return date.getFullYear() === 2022 || date.getFullYear() === 2023
    });
  const activityTypes = new Set<string>()

  const toursByMonthYear = {};
  tours.forEach(tour => {
    const monthYear = dateToMonthYear(Date.parse(tour.date));
    if (toursByMonthYear[monthYear] === undefined) {
      toursByMonthYear[monthYear] = [tour];
    } else (toursByMonthYear[monthYear] as Tour[]).push(tour);
  });

  const data = Object.entries(toursByMonthYear).map(pair => {
    const monthYear = pair[0];
    const monthTours = pair[1] as Tour[];

    const dataObject = {
      name: monthYear
    }

    monthTours.forEach(tour => {
      const activity = getSportName(tour)
      if (!dataObject[activity]) dataObject[activity] = tour.distance / 1.609 / 1000
      else dataObject[activity] = dataObject[activity] + tour.distance / 1.609 / 1000

      activityTypes.add(activity)
    })

    return dataObject
  });

  console.log(data)
  console.log(Array.from(activityTypes))

  return <ResponsiveContainer width={'99%'} height={300}>
    <LineChart
      width={500}
      height={300}
      data={data}
      margin={{
        top: 10,
        bottom: 5,
        right: 5
      }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <RechartsTooltip formatter={value => `${(value as number).toFixed(1)} miles`} />
      <Legend />
      {Array.from(activityTypes).map(type => <Line key={type} type="monotone" dataKey={type} stroke={colorHash.hex(type)} />)}
    </LineChart>
  </ResponsiveContainer>;
}

function dateToMonthYear(timeInMillis: number): string {
  const date = new Date(timeInMillis);
  return `${date.getMonth() + 1}/${date.getFullYear()}`;
}

function getSportName(tour: Tour): string {
  const isBike = tour.sport.includes("bike") || tour.sport.includes("bicycle")
  if (!isBike) return tour.sport.charAt(0).toLocaleUpperCase() + tour.sport.substring(1, tour.sport.length)
  else if (tour.name.endsWith("(P)")) return "Propella e-bike"
  else if (tour.name.endsWith("(R)")) return "Cervelo road bike"
  else return "Specialized e-bike"
}