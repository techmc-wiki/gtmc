import {
  usePdfcnTheme,
  useSafeMemo,
} from "@/components/pdf/theme-provider";
import {
  View,
  Text as PDFText,
  StyleSheet,
  Image,
} from "@/lib/pdf-primitives";
import type { Style } from "@/lib/pdf-primitives";
import type { PdfcnTheme } from "@/types/pdf-themes";

/** HTTP method used when fetching the image from a URL. */
export type PdfImageHTTPMethod =
  | "GET"
  | "HEAD"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH";

export type PdfImageSrc =
  | string
  | {
      uri: string;
      method?: PdfImageHTTPMethod;
      headers?: Record<string, string>;
      body?: string;
    };

export type PdfImageFit = "cover" | "contain" | "fill" | "none";

export type PdfImageVariant =
  | "default"
  | "full-width"
  | "thumbnail"
  | "avatar"
  | "cover"
  | "bordered"
  | "rounded";

/**
 * Image element with layout presets, caption, and aspect ratio support.
 * Props - `src` | `variant` | `width` | `height` | `fit` | `position` | `caption` | `aspectRatio` | `borderRadius` | `noWrap` | `style`
 * @see {@link PdfImageProps}
 */
export interface PdfImageProps {
  src: PdfImageSrc;
  /**
   * @default 'default'
   */
  variant?: PdfImageVariant;
  width?: number | string;
  height?: number | string;
  fit?: PdfImageFit;
  /**
   * @default '50% 50%'
   */
  position?: string;
  caption?: string;
  aspectRatio?: number;
  borderRadius?: number;
  /**
   * @default true
   */
  noWrap?: boolean;
  style?: Style;
}

interface VariantDefaults {
  width?: number | string;
  height?: number | string;
  fit: PdfImageFit;
  borderRadius?: number;
}

const VARIANT_DEFAULTS: Record<PdfImageVariant, VariantDefaults> = {
  avatar: { borderRadius: 999, fit: "cover", height: 48, width: 48 },
  bordered: { fit: "contain", width: "100%" },
  cover: { fit: "cover", height: 160, width: "100%" },
  default: { fit: "contain" },
  "full-width": { fit: "cover", width: "100%" },
  rounded: { borderRadius: 8, fit: "contain", width: 200 },
  thumbnail: { fit: "cover", height: 80, width: 80 },
};

const UNSUPPORTED_FORMATS = new Set(["webp", "avif", "heic", "heif", "ico"]);

const detectFormat = (src: PdfImageSrc): string | null => {
  if (typeof src !== "string") {
    return null;
  }
  const dataMatch = src.match(/^data:image\/([a-zA-Z0-9+.-]+)/);
  if (dataMatch) {
    return dataMatch[1].toLowerCase();
  }
  return src.split("?")[0].split(".").pop()?.toLowerCase() ?? null;
};

const warnIfUnsupported = (src: PdfImageSrc): void => {
  const fmt = detectFormat(src);
  if (fmt && UNSUPPORTED_FORMATS.has(fmt)) {
    console.warn(
      `[PdfImage] Unsupported format "${fmt}" detected. react-pdf supports: JPEG, PNG, GIF (first frame), BMP, SVG. Convert to PNG or JPEG before use.`
    );
  }
};

const createImageStyles = (t: PdfcnTheme) => {
  const { spacing } = t.primitives;
  return StyleSheet.create({
    caption: {
      color: t.colors.mutedForeground,
      fontFamily: t.typography.body.fontFamily,
      fontSize: t.primitives.typography.xs,
      marginTop: spacing[1],
      textAlign: "center",
    },
    container: { flexDirection: "column" },
    image: {},
    imageBordered: {
      borderColor: t.colors.border,
      borderStyle: "solid",
      borderWidth: 1,
    },
  });
};

export const PdfImage = ({
  src,
  variant = "default",
  width,
  height,
  fit,
  position = "50%",
  caption,
  aspectRatio,
  borderRadius,
  noWrap = true,
  style,
}: PdfImageProps) => {
  warnIfUnsupported(src);
  const theme = usePdfcnTheme();
  const styles = useSafeMemo(() => createImageStyles(theme), [theme]);
  const defaults = VARIANT_DEFAULTS[variant];

  const resolvedWidth = width ?? defaults.width;
  const resolvedHeight: number | string | undefined = (() => {
    if (height !== undefined) {
      return height;
    }
    if (defaults.height !== undefined) {
      return defaults.height;
    }
    if (aspectRatio !== undefined && typeof resolvedWidth === "number") {
      return resolvedWidth / aspectRatio;
    }
  })();

  const resolvedFit = fit ?? defaults.fit;
  const resolvedRadius = borderRadius ?? defaults.borderRadius;

  const imageStyles: Style[] = [styles.image];
  if (resolvedWidth !== undefined) {
    imageStyles.push({ width: resolvedWidth } as Style);
  }
  if (resolvedHeight !== undefined) {
    imageStyles.push({ height: resolvedHeight } as Style);
  }
  imageStyles.push({
    objectFit: resolvedFit,
    objectPosition: position,
  } as Style);
  if (resolvedRadius !== undefined) {
    imageStyles.push({ borderRadius: resolvedRadius } as Style);
  }
  if (variant === "bordered") {
    imageStyles.push(styles.imageBordered);
  }
  if (style) {
    imageStyles.push(style);
  }

  const content = (
    <View style={styles.container}>
      <Image src={src} style={imageStyles} />
      {caption ? <PDFText style={styles.caption}>{caption}</PDFText> : null}
    </View>
  );

  return noWrap ? (
    <View style={[{ breakInside: "avoid" as const }].filter(Boolean)}>
      {content}
    </View>
  ) : (
    content
  );
};
