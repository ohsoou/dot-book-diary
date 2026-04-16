import 'server-only';

import { AppError } from '@/lib/errors';
import { serverEnv } from '@/lib/env';
import { convertIsbn10to13 } from '@/lib/isbn';
import type { BookSearchResult } from '@/types';

const ALADIN_BASE_URL = 'https://www.aladin.co.kr/ttb/api';
const TIMEOUT_MS = 5_000;
const MAX_ATTEMPTS = 2;

type AladinItem = {
  title?: string;
  author?: string;
  publisher?: string;
  isbn?: string;
  isbn13?: string;
  cover?: string;
  subInfo?: { itemPage?: number };
};

type AladinSearchResponse = {
  item?: AladinItem[];
};

function normalizeItem(item: AladinItem): BookSearchResult | null {
  if (!item.title) return null;
  return {
    isbn: item.isbn13 ?? item.isbn,
    title: item.title,
    author: item.author,
    publisher: item.publisher,
    coverUrl: item.cover,
    totalPages: item.subInfo?.itemPage,
  };
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 60 },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAladin(url: string): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetchWithTimeout(url);
      if (res.status === 429) {
        throw new AppError('RATE_LIMITED', '알라딘 API 요청 한도를 초과했어요. 잠시 후 다시 시도해 주세요.');
      }
      return res;
    } catch (err) {
      if (err instanceof AppError && err.code === 'RATE_LIMITED') {
        throw err;
      }
      lastError = err;
    }
  }
  throw new AppError('UPSTREAM_FAILED', '책 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.', lastError);
}

/**
 * 키워드로 책을 검색한다.
 */
export async function searchByKeyword(query: string): Promise<BookSearchResult[]> {
  const params = new URLSearchParams({
    ttbkey: serverEnv.ALADIN_TTB_KEY,
    Query: query,
    QueryType: 'Keyword',
    MaxResults: '20',
    start: '1',
    SearchTarget: 'Book',
    output: 'js',
    Version: '20131101',
    Cover: 'Big',
  });
  const url = `${ALADIN_BASE_URL}/ItemSearch.aspx?${params.toString()}`;
  const res = await fetchAladin(url);

  if (!res.ok) {
    throw new AppError('UPSTREAM_FAILED', '책 검색에 실패했어요.');
  }

  const json: AladinSearchResponse = await res.json() as AladinSearchResponse;
  return (json.item ?? []).map(normalizeItem).filter((item): item is BookSearchResult => item !== null);
}

/**
 * ISBN으로 단일 책을 조회한다. ISBN-10 입력 시 ISBN-13으로 변환.
 */
export async function fetchByIsbn(isbn: string): Promise<BookSearchResult | null> {
  const normalized = /^\d{10}$|^\d{9}X$/i.test(isbn.replace(/[-\s]/g, ''))
    ? (convertIsbn10to13(isbn) ?? isbn)
    : isbn;

  const params = new URLSearchParams({
    ttbkey: serverEnv.ALADIN_TTB_KEY,
    itemIdType: 'ISBN13',
    ItemId: normalized,
    output: 'js',
    Version: '20131101',
    Cover: 'Big',
  });
  const url = `${ALADIN_BASE_URL}/ItemLookUp.aspx?${params.toString()}`;
  const res = await fetchAladin(url);

  if (!res.ok) {
    throw new AppError('UPSTREAM_FAILED', '책 정보를 불러오지 못했어요.');
  }

  const json: AladinSearchResponse = await res.json() as AladinSearchResponse;
  const items = (json.item ?? []).map(normalizeItem).filter((item): item is BookSearchResult => item !== null);
  return items[0] ?? null;
}