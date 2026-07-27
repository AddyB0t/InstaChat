const TRACKING_QUERY_KEYS = new Set([
  'context',
  'fbclid',
  'gclid',
  'igsh',
  'ref',
  'ref_src',
  'ref_url',
  'share',
  'si',
  'source',
  'utm_campaign',
  'utm_content',
  'utm_medium',
  'utm_source',
  'utm_term',
  'web3x',
  'web3xcss',
]);

const stripTrailingSlash = (value: string): string => {
  const hashIndex = value.indexOf('#');
  const queryIndex = value.indexOf('?');
  const protectedIndex = [hashIndex, queryIndex]
    .filter(index => index >= 0)
    .sort((a, b) => a - b)[0];

  if (protectedIndex !== undefined) {
    return value;
  }

  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const isXStatusUrl = (hostname: string, pathname: string): boolean => (
  (hostname === 'x.com' || hostname === 'twitter.com' || hostname === 'mobile.twitter.com') &&
  pathname.includes('/status/')
);

type ParsedArticleUrl = {
  protocol: string;
  hostname: string;
  pathname: string;
  query: string;
  hasFragment: boolean;
};

export type ArticleUrlLogDetails = {
  rawUrl: string;
  normalizedUrl: string;
  normalizedChanged: boolean;
  rawLength: number;
  protocol?: string;
  hostname?: string;
  pathname?: string;
  hasQuery: boolean;
  hasFragment: boolean;
  queryKeys: string[];
};

const parseArticleUrl = (rawUrl: string): ParsedArticleUrl | null => {
  const trimmed = rawUrl.trim();
  const match = trimmed.match(/^([a-z][a-z\d+\-.]*:\/\/)([^/?#]+)([^?#]*)(?:\?([^#]*))?(#.*)?$/i);

  if (!match) {
    return null;
  }

  return {
    protocol: match[1].toLowerCase(),
    hostname: match[2].replace(/^www\./i, '').toLowerCase(),
    pathname: match[3] || '',
    query: match[4] || '',
    hasFragment: Boolean(match[5]),
  };
};

const getQueryKeys = (query: string): string[] => (
  query
    .split('&')
    .filter(Boolean)
    .map(param => param.split('=')[0].toLowerCase())
);

export const normalizeArticleUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.trim();
  const parsed = parseArticleUrl(trimmed);

  if (!parsed) {
    return trimmed;
  }

  const { protocol, pathname, query } = parsed;
  let { hostname } = parsed;

  if (isXStatusUrl(hostname, pathname)) {
    hostname = 'x.com';
    return stripTrailingSlash(`${protocol}${hostname}${pathname}`);
  }

  const params = query
    .split('&')
    .filter(Boolean)
    .filter(param => {
      const key = param.split('=')[0].toLowerCase();
      return !key.startsWith('utm_') && !TRACKING_QUERY_KEYS.has(key);
    });

  const normalized = `${protocol}${hostname}${pathname}${params.length > 0 ? `?${params.join('&')}` : ''}`;
  return stripTrailingSlash(normalized);
};

export const describeArticleUrl = (rawUrl: string): ArticleUrlLogDetails => {
  const trimmed = rawUrl.trim();
  const parsed = parseArticleUrl(trimmed);
  const normalizedUrl = normalizeArticleUrl(trimmed);

  if (!parsed) {
    return {
      rawUrl: trimmed,
      normalizedUrl,
      normalizedChanged: normalizedUrl !== trimmed,
      rawLength: trimmed.length,
      hasQuery: false,
      hasFragment: false,
      queryKeys: [],
    };
  }

  return {
    rawUrl: trimmed,
    normalizedUrl,
    normalizedChanged: normalizedUrl !== trimmed,
    rawLength: trimmed.length,
    protocol: parsed.protocol.replace('://', ''),
    hostname: parsed.hostname,
    pathname: parsed.pathname,
    hasQuery: parsed.query.length > 0,
    hasFragment: parsed.hasFragment,
    queryKeys: getQueryKeys(parsed.query),
  };
};
