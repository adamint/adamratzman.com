import { useData } from '../../../utils/useData';
import { ReactNode, useEffect } from 'react';
import { Box, filter, Flex } from '@chakra-ui/react';
import Pagination from '@choc-ui/paginator';
import { TimeRange } from '../../../utils/SpotifyTypes';
import { SpotifyPagination } from '../../../utils/SpotifyApiPaginationHelper';
import { useRouter } from 'next/router';

type PaginatedSpotifyDisplayProps<DataType extends SpotifyPagination<ChildType>, ChildType, ChildMappedType extends ReactNode> = {
  dataProducer: (...args: any[]) => Promise<DataType>;
  childDataMapper: (child: ChildType) => ChildMappedType;
  timeRange?: TimeRange | null;
  limitPerPage: number;
  setLimitPerPage: Function;
  pageOffset: number;
  setPageOffset: Function;
  filterNotNull: (child: any) => boolean
}

export function PaginatedSpotifyDisplay<DataType extends SpotifyPagination<ChildType>, ChildType, ChildMappedType extends any>({
                                                                                                                     dataProducer,
                                                                                                                     childDataMapper,
                                                                                                                     timeRange = null,
                                                                                                                     limitPerPage,
                                                                                                                     setLimitPerPage,
                                                                                                                     pageOffset,
                                                                                                                     setPageOffset,
                                                                                                                     filterNotNull,
                                                                                                                   }: PaginatedSpotifyDisplayProps<DataType, ChildType, ChildMappedType>) {
  const { data, loading, error, update } = useData<DataType>(async () => {
    return await dataProducer(limitPerPage, pageOffset);
  }, [timeRange], [limitPerPage, pageOffset], false);

  const router = useRouter();

  useEffect(() => {
    // noinspection JSIgnoredPromiseFromCall
    update(dataProducer, true, [limitPerPage, pageOffset]);
    // eslint-disable-next-line
  }, [limitPerPage, pageOffset]);

  if (error) {
    console.log(error)
    router.push('/projects/spotify');
    return null;
  }

  if (loading || !data) return null;

  function handleOnShowSizeChange(currentPage: number | undefined, size: number | undefined) {
    setLimitPerPage(size ?? 10);
    setPageOffset(0);
  }

  const items = data.items.filter(filterNotNull)

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