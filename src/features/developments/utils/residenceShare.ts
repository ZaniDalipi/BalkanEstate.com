/**
 * The links behind "Share this residence": the residence page in the
 * sharer's language (its link preview is the residence card) and the card
 * image itself, which the share window shows so people see what they post.
 */
export interface ResidenceShareLinks {
  pageUrl: string;
  cardUrl: string;
}

export function residenceShareLinks(origin: string, lang: string, slug: string, apiUrl: string): ResidenceShareLinks {
  const s = encodeURIComponent(slug);
  return {
    pageUrl: `${origin.replace(/\/+$/, '')}/${lang}/developments/${s}`,
    cardUrl: `${apiUrl.replace(/\/+$/, '')}/og/residence/${s}/image.jpg?lang=${encodeURIComponent(lang)}`,
  };
}
