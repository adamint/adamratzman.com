import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  Select,
  Text,
} from '@chakra-ui/react';
import { useId } from 'react';

type AccessiblePaginationProps = {
  allowedPageSizes: readonly number[];
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSize: number;
  totalItems: number;
};

export function AccessiblePagination({
  allowedPageSizes,
  currentPage,
  onPageChange,
  onPageSizeChange,
  pageSize,
  totalItems,
}: AccessiblePaginationProps) {
  const pageSizeId = useId();
  const normalizedPageSize = normalizePageSize(pageSize);
  const normalizedTotalItems = Number.isFinite(totalItems)
    ? Math.max(0, totalItems)
    : 0;
  const totalPages = Math.max(
    1,
    Math.ceil(normalizedTotalItems / normalizedPageSize),
  );
  const normalizedCurrentPage = Number.isInteger(currentPage)
    ? currentPage
    : 1;
  const displayedPage = Math.min(
    Math.max(1, normalizedCurrentPage),
    totalPages,
  );

  return <Flex
    alignItems='center'
    aria-label='Spotify results pages'
    as='nav'
    flexWrap='wrap'
    gap={3}
    justifyContent='center'
  >
    <Button
      aria-label='Previous page'
      isDisabled={displayedPage === 1}
      onClick={() => {
        if (displayedPage > 1) {
          onPageChange(displayedPage - 1);
        }
      }}
      size='sm'
    >
      Previous
    </Button>
    <Text
      aria-label='Pagination status'
      aria-live='polite'
      role='status'
    >
      Page {displayedPage} of {totalPages}
    </Text>
    <Button
      aria-label='Next page'
      isDisabled={displayedPage === totalPages}
      onClick={() => {
        if (displayedPage < totalPages) {
          onPageChange(displayedPage + 1);
        }
      }}
      size='sm'
    >
      Next
    </Button>
    <FormControl alignItems='center' display='flex' w='auto'>
      <FormLabel htmlFor={pageSizeId} mb={0} whiteSpace='nowrap'>
        Results per page
      </FormLabel>
      <Select
        id={pageSizeId}
        onChange={event => onPageSizeChange(normalizePageSize(event.target.value))}
        size='sm'
        value={normalizedPageSize}
        w='auto'
      >
        {allowedPageSizes.map(allowedPageSize => (
          <option key={allowedPageSize} value={allowedPageSize}>
            {allowedPageSize}
          </option>
        ))}
      </Select>
    </FormControl>
  </Flex>;
}

export function normalizePageSize(value: unknown) {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return 10;
  }

  const size = Number(value);
  return Number.isFinite(size) && Number.isInteger(size) && size > 0
    ? size
    : 10;
}
