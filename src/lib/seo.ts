import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "./site";

type OgInput = {
  title: string;
  description?: string;
  path: string;
  image?: string | null;
  type?: "website" | "profile" | "article";
};

export function buildPageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
  image,
  type = "website",
}: OgInput): Metadata {
  const url = absoluteUrl(path);
  const fullTitle = title.includes(SITE_NAME)
    ? title
    : `${title} · ${SITE_NAME}`;
  const fallbackImage = absoluteUrl("/icons/icon-512.svg");
  const images = image
    ? [{ url: image, width: 1200, height: 630, alt: title }]
    : [{ url: fallbackImage, width: 1200, height: 630, alt: SITE_NAME }];

  return {
    title: fullTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      type,
      locale: "en_US",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: images.map((i) => i.url),
    },
    // Helpful when links are pasted into FB / iMessage / Discord / etc.
    other: {
      "og:image:alt": title,
    },
  };
}
