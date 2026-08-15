import { ReactNode, useEffect, useRef, useState } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import Pagination from '@choc-ui/paginator';
import { TimeRange } from '../../../utils/SpotifyTypes';
import { SpotifyPagination } from '../../../utils/SpotifyApiPaginationHelper';
import { useNavigate } from 'react-router-dom';

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

  if (error) return null;

  if (loading || !data) return null;

  function handleOnShowSizeChange(currentPage: number | undefined, size: number | undefined) {
    setLimitPerPage(normalizePageSize(size));
    setPageOffset(0);
  }

  const items = data.items.filter(filterNotNull);

  return <>
    <Box mb={5}>
      {items.map(item => childDataMapper(item))}
    </Box>
    <Box>
      <Flex
        w='full'
        p={5}
        alignItems='center'
        justifyContent='center'
      >
        <Pagination
          colorScheme='blue'
          current={pageOffset + 1}
          total={data.total}
          showSizeChanger
          paginationProps={{ display: 'flex' }}
          pageSize={limitPerPage}
          pageSizeOptions={[10, 20, 25, 50]}
          onShowSizeChange={handleOnShowSizeChange}
          onChange={newPage => setPageOffset(newPage ? newPage - 1 : 0)}
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

export function normalizePageSize(value: unknown) {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return 10;
  }

  const size = Number(value);
  return Number.isFinite(size) && Number.isInteger(size) && size > 0
    ? size
    : 10;
}
