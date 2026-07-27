import { describeArticleUrl, normalizeArticleUrl } from '../services/urlUtils';

test('normalizes X share URLs with different tracking params to one article URL', () => {
  expect(
    normalizeArticleUrl('https://x.com/imastudio_ai/status/2081346292996014293?s=12&t=d2lQcHp1SSMtJ34JV9wvDg')
  ).toBe('https://x.com/imastudio_ai/status/2081346292996014293');

  expect(
    normalizeArticleUrl('https://x.com/imastudio_ai/status/2081346292996014293?s=12')
  ).toBe('https://x.com/imastudio_ai/status/2081346292996014293');
});

test('removes common tracking params without removing useful query params', () => {
  expect(
    normalizeArticleUrl('https://youtube.com/watch?v=abc123&si=share-token&utm_source=x')
  ).toBe('https://youtube.com/watch?v=abc123');
});

test('normalizes Instagram share URLs without changing the post path', () => {
  expect(
    normalizeArticleUrl('https://www.instagram.com/reel/ABC123/?igsh=MzRlODBiNWFlZA==&utm_source=ig_web_copy_link')
  ).toBe('https://instagram.com/reel/ABC123');
});

test('keeps important non-tracking Facebook query params', () => {
  expect(
    normalizeArticleUrl('https://www.facebook.com/story.php?story_fbid=123&id=456&fbclid=tracking')
  ).toBe('https://facebook.com/story.php?story_fbid=123&id=456');
});

test('describes URLs for share pipeline logging', () => {
  expect(
    describeArticleUrl('https://x.com/imastudio_ai/status/2081346292996014293?s=12&t=abc')
  ).toMatchObject({
    hostname: 'x.com',
    hasQuery: true,
    normalizedChanged: true,
    queryKeys: ['s', 't'],
    normalizedUrl: 'https://x.com/imastudio_ai/status/2081346292996014293',
  });
});
