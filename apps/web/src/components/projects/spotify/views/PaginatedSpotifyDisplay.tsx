import { ReactNode, useEffect, useRef, useState } from 'react';
import { Box, Flex, Spinner } from '@chakra-ui/react';
import { TimeRange } from '../../../utils/SpotifyTypes';
import { SpotifyPagination } from '../../../utils/SpotifyApiPaginationHelper';
import { useNavigate } from 'react-router-dom';
import {
  AccessiblePagination,
  normalizePageSize,
} from './AccessiblePagination';

const SPOTIFY_PAGE_SIZES = [10, 20, 25, 50];

type PaginatedSpotifyDisplayProps<DataType extends SpotifyPagination<ChildType>, ChildType> = {
  dataProducer: (
    limitPerPage: number,
    pageOffset: number,
    signal: AbortSignal,
  ) => Promise<DataType>;
  childDataMapper: (child: ChildType) => ReactNode;
  timeRange?: TimeRange | null;
  limitPerPage: number;
  setLimitPerPage: (limitPerPage: number) => void;
  pageOffset: number;
  setPageOffset: (pageOffset: number) => void;
  filterNotNull: (child: ChildType) => boolean
}

export function PaginatedSpotifyDisplay<DataType extends SpotifyPagination<ChildType>, ChildType>({
                                                                                                    dataProducer,
                                                                                                    childDataMapper,
                                                                                                    timeRange = null,
                                                                                                    limitPerPage,
                                                                                                    setLimitPerPage,
                                                                                                    pageOffset,
                                                                                                    setPageOffset,
                                                                                                    filterNotNull,
                                                                                                  }: PaginatedSpotifyDisplayProps<DataType, ChildType>) {
  const navigate = useNavigate();
  const generationRef = useRef(0);
  const focusAfterRequestRef = useRef(false);
  const focusCompletedGenerationRef = useRef<number | null>(null);
  const resultsRegionRef = useRef<HTMLDivElement>(null);
  const [{ data, loading, error }, setRequestState] = useState<{
    data: DataType | null;
    error: boolean;
    loading: boolean;
  }>({
    data: null,
    error: false,
    loading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    const generation = ++generationRef.current;
    const shouldFocusAfterSuccess = focusAfterRequestRef.current;
    focusAfterRequestRef.current = false;
    focusCompletedGenerationRef.current = null;
    let active = true;
    setRequestState({
      data: null,
      error: false,
      loading: true,
    });

    const requestTimer = window.setTimeout(() => {
      if (!active || controller.signal.aborted || generation !== generationRef.current) {
        return;
      }

      void dataProducer(limitPerPage, pageOffset, controller.signal).then(
        nextData => {
          if (!active || controller.signal.aborted || generation !== generationRef.current) {
            return;
          }

          focusCompletedGenerationRef.current = shouldFocusAfterSuccess
            ? generation
            : null;
          setRequestState({
            data: nextData,
            error: false,
            loading: false,
          });
        },
        requestError => {
          if (!active || controller.signal.aborted || generation !== generationRef.current) {
            return;
          }

          if (isAbortError(requestError)) {
            setRequestState({
              data: null,
              error: false,
              loading: false,
            });
            return;
          }

          setRequestState({
            data: null,
            error: true,
            loading: false,
          });
          void navigate('/projects/spotify', { replace: true });
        },
      );
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(requestTimer);
      controller.abort();
    };
  }, [dataProducer, limitPerPage, navigate, pageOffset, timeRange]);

  useEffect(() => {
    if (
      data
      && !loading
      && focusCompletedGenerationRef.current === generationRef.current
    ) {
      focusCompletedGenerationRef.current = null;
      resultsRegionRef.current?.focus();
    }
  }, [data, loading]);

  if (error) return null;

  if (loading) {
    return <Flex
      alignItems='center'
      aria-label='Loading Spotify results'
      justifyContent='center'
      py={8}
      role='status'
    >
      <Spinner aria-hidden='true' color='blue.500' size='lg' />
    </Flex>;
  }

  if (!data) return null;

  function handlePageSizeChange(size: number) {
    const normalizedSize = normalizePageSize(size);
    if (normalizedSize === limitPerPage && pageOffset === 0) {
      return;
    }

    focusAfterRequestRef.current = true;
    setLimitPerPage(normalizedSize);
    setPageOffset(0);
  }

  function handlePageChange(page: number) {
    const nextPageOffset = Math.max(0, page - 1);
    if (nextPageOffset === pageOffset) {
      return;
    }

    focusAfterRequestRef.current = true;
    setPageOffset(nextPageOffset);
  }

  const items = data.items.filter(filterNotNull);

  return <>
    <Box
      aria-label='Spotify results'
      mb={5}
      ref={resultsRegionRef}
      role='region'
      tabIndex={-1}
    >
      {items.map(item => childDataMapper(item))}
    </Box>
    <Box>
      <Flex
        w='full'
        p={5}
        alignItems='center'
        justifyContent='center'
      >
        <AccessiblePagination
          allowedPageSizes={SPOTIFY_PAGE_SIZES}
          currentPage={pageOffset + 1}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSize={limitPerPage}
          totalItems={data.total}
        />
      </Flex>
    </Box>
  </>;
}

function isAbortError(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && Reflect.get(error, 'name') === 'AbortError';
}

export { normalizePageSize } from './AccessiblePagination';
