import { PaginationRequest } from '../../utils/useKomootData';
import React, { PropsWithChildren } from 'react';
import { Box, BoxProps, Button, Flex, HStack, Spacer } from '@chakra-ui/react';

export function metersToMiles(meters: number) {
  return meters / 1000 / 1.609;
}

interface PaginationProps {
  next?: PaginationRequest | null;
  nextText: string,
  previousText: string,
  previous?: PaginationRequest | null;
  setOffset: (offset: number) => void;
  setLimit: (limit: number) => void;
  switchPreviousAndNext?: boolean;
}

export function Pagination({
                             next,
                             nextText,
                             previous,
                             previousText,
                             setOffset,
                             setLimit,
                             children,
                             switchPreviousAndNext = false,
  ...rest
                           }: PaginationProps & PropsWithChildren & BoxProps) {
  function onPreviousButtonClicked() {
    setOffset(previous!.offset);
    setLimit(previous!.limit);
  }

  function onNextButtonClicked() {
    setOffset(next!.offset);
    setLimit(next!.limit);
  }

  const nextButton = <Button key={nextText} isDisabled={!next} onClick={onNextButtonClicked} variant='solid'
                             colorScheme='blue'>{nextText}</Button>;
  const previousButton = <Button key={previousText} isDisabled={!previous} onClick={onPreviousButtonClicked}
                                 variant='outline'
                                 colorScheme='blue'>{previousText}</Button>;

  const buttons = switchPreviousAndNext ? [nextButton, previousButton] : [previousButton, nextButton];

  return <Box {...rest}>
    <Box mb={0}>
      {children}
    </Box>
    <Flex>
      <Spacer />
      <HStack spacing={3}>
        {buttons}
      </HStack>
    </Flex>
  </Box>;
}