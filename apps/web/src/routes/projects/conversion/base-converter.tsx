import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Select,
  Text,
} from '@chakra-ui/react';
import { useState } from 'react';
import { PageTitle } from '../../../components/meta/PageTitle';
import { ProjectPage } from '../../../components/projects/ProjectPage';

const validBases: number[] = [];
for (let i = 2; i <= 32; i++) validBases.push(i);

type Conversion = {
  kind: 'error';
} | {
  kind: 'success';
  result: string;
};

function BaseConverterRoute() {
  const [numberToConvert, setNumberToConvert] = useState<string>('');
  const [baseToConvertFrom, setBaseToConvertFrom] = useState<number | null>(null);
  const [baseToConvertTo, setBaseToConvertTo] = useState<number | null>(null);
  const conversion = convertNumber(
    numberToConvert,
    baseToConvertFrom,
    baseToConvertTo,
  );

  function handleInverseButtonClicked() {
    setBaseToConvertTo(baseToConvertFrom);
    setBaseToConvertFrom(baseToConvertTo);
  }

  return <ProjectPage projectTitle='Base converter' isLoading={false}>
    <PageTitle title="Base converter" />
    <Heading as='h2' size='lg' mb={5}>I want to convert...</Heading>

    <FormControl isRequired mb={3}>
      <FormLabel htmlFor='number-to-convert'>Number to convert</FormLabel>
      <Input id='number-to-convert'
             maxW='400px'
             value={numberToConvert}
             onChange={event => setNumberToConvert(event.target.value)}
             placeholder='Enter number here..' />
    </FormControl>

    <FormControl isRequired mb={3}>
      <FormLabel htmlFor='base-to-convert-from'>From base</FormLabel>
      <Select id='base-to-convert-from'
              maxW='400px'
              value={baseToConvertFrom ?? 'select'} onChange={e => {
        if (e.target.value !== 'select') setBaseToConvertFrom(parseInt(e.target.value));
        else setBaseToConvertFrom(null);
      }
      }>
        <option value='select'>Select base</option>
        {validBases.map(base => <option value={base} key={base}>{base}</option>)}
      </Select>
    </FormControl>

    <FormControl isRequired mb={5}>
      <FormLabel htmlFor='base-to-convert-to'>To base</FormLabel>
      <Select id='base-to-convert-to'
              maxW='400px'
              value={baseToConvertTo ?? 'select'} onChange={e => {
        if (e.target.value !== 'select') setBaseToConvertTo(parseInt(e.target.value));
        else setBaseToConvertTo(null);
      }
      }>
        <option value='select'>Select base</option>
        {validBases.map(base => <option value={base} key={base}>{base}</option>)}
      </Select>
    </FormControl>

    {conversion?.kind === 'error' && <Alert role='alert' status='error' mb={5}>
      <AlertIcon />
      <AlertDescription>
        You specified an invalid number for that base.
      </AlertDescription>
    </Alert>}

    {conversion?.kind === 'success' && <Box role='status'
                                            aria-live='polite'
                                            aria-atomic='true'
                                            mb={5}>
      <Text><b>Result: </b> {conversion.result}</Text>
    </Box>}

    <Button colorScheme='orange' onClick={handleInverseButtonClicked}>Inverse to/from</Button>

  </ProjectPage>;
}

function convertNumber(
  value: string,
  baseToConvertFrom: number | null,
  baseToConvertTo: number | null,
): Conversion | null {
  if (!baseToConvertFrom || !baseToConvertTo) return null;

  const trimmedValue = value.trim();
  const digits = trimmedValue.replace(/^[+-]/u, '');
  const hasInvalidDigit = !digits || [...digits.toLowerCase()].some(character => {
    const digit = Number.parseInt(character, 36);
    return Number.isNaN(digit) || digit >= baseToConvertFrom;
  });
  if (hasInvalidDigit) return { kind: 'error' };

  const number = Number.parseInt(trimmedValue, baseToConvertFrom);
  if (Number.isNaN(number)) return { kind: 'error' };

  return {
    kind: 'success',
    result: number.toString(baseToConvertTo),
  };
}

export default BaseConverterRoute;