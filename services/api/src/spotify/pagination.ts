export type SpotifyPagination<Item> = {
  items: Item[];
  next?: string | null;
  total?: number;
};

export async function getAllPages<Response extends SpotifyPagination<Item>, Item>(
  request: (limit: number, offset: number) => Promise<Response>,
  limit = 50,
): Promise<Response> {
  const paginatedResponse = await request(limit, 0);
  let currentResponse = paginatedResponse;
  let total = currentResponse.items.length;
  let expectedTotal = currentResponse.total;

  while (currentResponse.next && (expectedTotal === undefined || total < expectedTotal)) {
    const nextResponse = await request(limit, total);
    if (nextResponse.items.length === 0) {
      break;
    }

    currentResponse = nextResponse;
    total += currentResponse.items.length;
    expectedTotal = currentResponse.total ?? expectedTotal;
    paginatedResponse.items = paginatedResponse.items.concat(currentResponse.items);
  }

  return paginatedResponse;
}
