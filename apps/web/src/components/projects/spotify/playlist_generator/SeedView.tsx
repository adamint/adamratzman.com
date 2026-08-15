import { AccordionButton, AccordionIcon, AccordionItem, AccordionPanel, Box, Textarea } from '@chakra-ui/react';
import type { SpotifyRecommendationsResponse } from '@adamratzman/contracts';

export function SeedView({
                           index,
                           seedSource,
                         }: {
  index: number;
  seedSource: SpotifyRecommendationsResponse['seeds'][number];
}) {
  return <AccordionItem>
    <h2>
      <AccordionButton>
        <Box flex='1' textAlign='left'>
          Seed {index + 1}
        </Box>
        <AccordionIcon />
      </AccordionButton>
    </h2>
    <AccordionPanel pb={4}>
      <Textarea isDisabled rows={8} defaultValue={JSON.stringify(seedSource, null, 2)} />
    </AccordionPanel>
  </AccordionItem>;
}