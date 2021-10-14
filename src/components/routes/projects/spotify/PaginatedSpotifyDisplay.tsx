import { useData } from '../../../utils/useData';
import { useHistory } from 'react-router-dom';
import { useEffect } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import Pagination from '@choc-ui/paginator';
import { TimeRange } from '../../../utils/SpotifyTypes';
import { SpotifyPagination } from '../../../utils/SpotifyApiPaginationHelper';

type PaginatedSpotifyDisplayProps<DataType extends SpotifyPagination<ChildType>, ChildType, ChildMappedType> = {
  dataProducer: (args: any[]) => Promise<DataType>;
  childDataMapper: (child: ChildType) => ChildMappedType;
  limitPerPage: number;
  setLimitPerPage: Function;
  pageOffset: number;
  setPageOffset: Function;
  timeRange: TimeRange;
}

export function PaginatedSpotifyDisplay<DataType extends SpotifyPagination<ChildType>, ChildType, ChildMappedType>({
                                                                                                                     dataProducer,
                                                                                                                     childDataMapper,
                                                                                                                     limitPerPage,
                                                                                                                     setLimitPerPage,
                                                                                                                     pageOffset,
                                                                                                                     setPageOffset,
                                                                                                                     timeRange,
                                                                                                                   }: PaginatedSpotifyDisplayProps<DataType, ChildType, ChildMappedType>) {
  const { data, loading, error, update } = useData<DataType>(async () => {
    return await dataProducer([]);
  });

  const history = useHistory();

  useEffect(() => {
    // noinspection JSIgnoredPromiseFromCall
    update(dataProducer, true, []);
    // eslint-disable-next-line
  }, [limitPerPage, pageOffset, timeRange]);

  if (error) {
    history.push('/projects/spotify');
    return null;
  }

  if (loading || !data) return null;
  return <>
    <Box mb={5}>
      {data.items.map(item => childDataMapper(item))}
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
          currentPage={pageOffset}
          total={data.total}
          showSizeChanger
          paginationProps={{ display: 'flex' }}
          pageSize={limitPerPage}
          pageSizeOptions={[10, 20, 25, 50]}
          onShowSizeChange={(currentPage, size) => setLimitPerPage(size)}
          onChange={newPage => setPageOffset(newPage ? newPage - 1 : 0)}
        />
      </Flex>
    </Box>
  </>;
}