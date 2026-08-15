export type SpotifyPagination<Item> = {
  items: Item[];
  next?: string | null;
  total?: number;
};

const MAX_SPOTIFY_CATEGORY_PAGES = 20;

function readPaginationTotal(total: number | undefined) {
  if (typeof total !== 'number' || !Number.isInteger(total) || total < 0) {
    throw new Error('Spotify pagination did not include a valid total.');
  }

  return total;
}

function readPaginationItems<Item>(items: Item[] | undefined) {
  if (!Array.isArray(items)) {
    throw new Error('Spotify pagination did not include valid items.');
  }

  return items;
}

function readPaginationNext(next: string | null | undefined) {
  if (next == null) {
    return null;
  }

  if (typeof next !== 'string' || next.length === 0) {
    throw new Error('Spotify pagination did not include a valid next page.');
  }

  return next;
}

export async function getAllPages<Response extends SpotifyPagination<Item>, Item>(
  request: (limit: number, offset: number) => Promise<Response>,
  limit = 50,
): Promise<Response> {
  let firstResponse: Response | undefined;
  let currentResponse: Response | undefined;
  let expectedTotal = 0;
  let aggregatedItems: Item[] = [];

  for (let pageIndex = 0; pageIndex < MAX_SPOTIFY_CATEGORY_PAGES; pageIndex += 1) {
    const nextResponse = await request(limit, aggregatedItems.length);
    const items = readPaginationItems(nextResponse.items);
    const total = readPaginationTotal(nextResponse.total);
    const next = readPaginationNext(nextResponse.next);

    if (firstResponse === undefined) {
      firstResponse = nextResponse;
      expectedTotal = total;
    } else if (total !== expectedTotal) {
      throw new Error('Spotify pagination returned inconsistent totals.');
    }

    currentResponse = nextResponse;
    aggregatedItems = aggregatedItems.concat(items);

    if (aggregatedItems.length > expectedTotal) {
      throw new Error('Spotify pagination exceeded the reported total.');
    }

    if (aggregatedItems.length === expectedTotal) {
      return {
        ...firstResponse,
        ...currentResponse,
        items: [...aggregatedItems],
        next: null,
        total: expectedTotal,
      };
    }

    if (next === null) {
      throw new Error('Spotify pagination ended before reaching the reported total.');
    }

    if (items.length === 0) {
      throw new Error('Spotify pagination did not advance.');
    }
  }

  if (firstResponse === undefined || currentResponse === undefined) {
    throw new Error('Spotify pagination did not return a first page.');
  }

  if (aggregatedItems.length !== expectedTotal) {
    throw new Error('Spotify pagination exceeded the category page cap.');
  }

  return {
    ...firstResponse,
    ...currentResponse,
    items: [...aggregatedItems],
    next: null,
    total: expectedTotal,
  };
}
