import { ProjectPage } from '../../../components/projects/ProjectPage';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import Head from 'next/head';

const validBases: number[] = [];
for (let i = 2; i <= 32; i++) validBases.push(i);

function BaseConverterRoute() {
  const [numberToConvert, setNumberToConvert] = useState<string>('');
  const [baseToConvertFrom, setBaseToConvertFrom] = useState<number | null>(null);
  const [baseToConvertTo, setBaseToConvertTo] = useState<number | null>(null);
  const [calculation, setCalculation] = useState<string | null>(null);

  const toast = useToast();

  useEffect(() => {
    if (!baseToConvertFrom || !baseToConvertTo) {
      return;
    }
    // noinspection JSCheckFunctionSignatures
    const num = parseInt(numberToConvert, baseToConvertFrom);
    if (isNaN(num)) {
      toast({
        status: 'error',
        title: 'You specified an invalid number for that base.',
        duration: 1000,
      });
      return;
    }
    // noinspection JSCheckFunctionSignatures
    const result = num.toString(baseToConvertTo);
    setCalculation(result);
    // eslint-disable-next-line
  }, [baseToConvertFrom, baseToConvertTo, numberToConvert]);

  function handleInverseButtonClicked() {
    setBaseToConvertTo(baseToConvertFrom);
    setBaseToConvertFrom(baseToConvertTo);
  }

  return <ProjectPage projectTitle='Base Conversion Tool' isLoading={false}>
    <Head>
      <title>Spotify Genres</title>
    </Head>
    <Heading size='lg' mb={5}>I want to convert...</Heading>

    <FormControl isRequired mb={3}>
      <FormLabel>Enter number</FormLabel>
      <NumberInput maxW='400px' value={numberToConvert} onChange={valueAsString => setNumberToConvert(valueAsString)}>
        <NumberInputField placeholder='Enter number here..' />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
    </FormControl>

    <FormControl isRequired mb={3}>
      <FormLabel>From base</FormLabel>
      <Select maxW='400px' value={baseToConvertFrom ?? 'select'} onChange={e => {
        if (e.target.value !== 'select') setBaseToConvertFrom(parseInt(e.target.value));
        else setBaseToConvertFrom(null);
      }
      }>
        <option value='select'>Select base</option>
        {validBases.map(base => <option value={base} key={base}>{base}</option>)}
      </Select>
    </FormControl>

    <FormControl isRequired mb={5}>
      <FormLabel>To base</FormLabel>
      <Select maxW='400px' value={baseToConvertTo ?? 'select'} onChange={e => {
        if (e.target.value !== 'select') setBaseToConvertTo(parseInt(e.target.value));
        else setBaseToConvertTo(null);
      }
      }>
        <option value='select'>Select base</option>
        {validBases.map(base => <option value={base} key={base}>{base}</option>)}
      </Select>
    </FormControl>

    {calculation && <Box mb={5}>
      <Text><b>Result: </b> {calculation}</Text>
    </Box>}

    <Button colorScheme='orange' onClick={handleInverseButtonClicked}>Inverse to/from</Button>

  </ProjectPage>;
}

export default BaseConverterRoute;