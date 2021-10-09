import { ProjectPage } from '../ProjectPage';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select, Text,
  useToast,
} from '@chakra-ui/react';
import { useDocumentTitle } from '../../../utils/useDocumentTitle';
import { useState } from 'react';

const validBases = [];
for (let i = 2; i <= 32; i++) validBases.push(i);

export function BaseConverterRoute() {
  useDocumentTitle('Genres');
  const [numberToConvert, setNumberToConvert] = useState('');
  const [baseToConvertFrom, setBaseToConvertFrom] = useState(null);
  const [baseToConvertTo, setBaseToConvertTo] = useState(null);
  const [calculation, setCalculation] = useState(null);

  const toast = useToast();

  function handleCalculateButtonClicked() {
    if (!baseToConvertFrom || !baseToConvertTo) {
      toast({
        status: "error",
        title: "You need to enter bases to convert from and to"
      })
      return
    }
    // noinspection JSCheckFunctionSignatures
    const num = parseInt(numberToConvert, baseToConvertFrom)
    if (isNaN(num)) {
      toast({
        status: "error",
        title: "You need to enter bases to convert from and to"
      })
      return
    }
    // noinspection JSCheckFunctionSignatures
    const result = num.toString(baseToConvertTo)
    setCalculation(result)
  }

  function handleInverseButtonClicked() {
    setBaseToConvertTo(baseToConvertFrom);
    setBaseToConvertFrom(baseToConvertTo);
  }

  return <ProjectPage projectTitle='Base Conversion Tool'
                      isLoading={false}>
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
      <Select maxW='400px' defaultValue={null} value={baseToConvertFrom} onChange={e => {
        if (e.target.value !== 'Select base') setBaseToConvertFrom(parseInt(e.target.value));
        else setBaseToConvertFrom(null)
      }
      }>
        <option value={null}>Select base</option>
        {validBases.map(base => <option value={base} key={base}>{base}</option>)}
      </Select>
    </FormControl>

    <FormControl isRequired mb={5}>
      <FormLabel>To base</FormLabel>
      <Select maxW='400px' defaultValue={null} value={baseToConvertTo} onChange={e => {
        if (e.target.value !== 'Select base') setBaseToConvertTo(parseInt(e.target.value));
        else setBaseToConvertTo(null)
      }
      }>
        <option value={null}>Select base</option>
        {validBases.map(base => <option value={base} key={base}>{base}</option>)}
      </Select>
    </FormControl>

    {calculation && <Box mb={5}>
      <Text><b>Result: </b> {calculation}</Text>
    </Box>}

    <HStack>
      <Button colorScheme='blue' onClick={handleCalculateButtonClicked}>Calculate</Button>
      <Button colorScheme='orange' onClick={handleInverseButtonClicked}>Inverse to/from</Button>
    </HStack>

  </ProjectPage>;
}