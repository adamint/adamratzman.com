import { useData } from '../../../utils/useData';
import { ReactNode, useEffect } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import Pagination from '@choc-ui/paginator';
import { TimeRange } from '../../../utils/SpotifyTypes';
import { SpotifyPagination } from '../../../utils/SpotifyApiPaginationHelper';
import { useNavigate } from 'react-router-dom';

type PaginatedSpotifyDisplayProps<DataType extends SpotifyPagination<ChildType>, ChildType> = {
  dataProducer: (limitPerPage: number, pageOffset: number) => Promise<DataType>;
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
  const { data, loading, error, update } = useData<DataType, unknown>(async () => {
    return await dataProducer(limitPerPage, pageOffset);
  }, [timeRange], [limitPerPage, pageOffset], false);

  const navigate = useNavigate();

  useEffect(() => {
    void update(
      async () => await dataProducer(limitPerPage, pageOffset),
      true,
      [],
    );
  }, [limitPerPage, pageOffset]);

  useEffect(() => {
    if (error) {
      console.log(error);
      void navigate('/projects/spotify');
    }
  }, [error, navigate]);

  if (error) {
    return null;
  }

  if (loading || !data) return null;

  function handleOnShowSizeChange(currentPage: number | undefined, size: number | undefined) {
    setLimitPerPage(size ?? 10);
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