import {
  usePdfcnTheme,
  useSafeMemo,
} from "@/components/pdf/theme-provider";
import {
  View,
  Text as PDFText,
  StyleSheet,
} from "@/lib/pdf-primitives";
import type { Style } from "@/lib/pdf-primitives";
import { resolveColor } from "@/lib/resolve-color";
import type { PDFComponentProps } from "@/types/pdf-components";
import type { PdfcnTheme } from "@/types/pdf-themes";

export type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "outline";
export type BadgeSize = "sm" | "md" | "lg";

/**
 * Inline label for status, tags, or categories.
 *
 * Accepts text via either `label` prop or `children` (string). `label` takes
 * precedence when both are provided. The children pattern (`<Badge>text</Badge>`)
 * is supported for compatibility with common React idioms, but note that
 * `Takumi primitives` doesn't support JSX children the way HTML does — only
 * string children are accepted.
 *
 * Props - `label` | `children` | `variant` | `size` | `background` | `color` | `style`
 * @see {@link BadgeProps}
 */
export interface BadgeProps extends Omit<PDFComponentProps, "children"> {
  /** Text to display. Takes precedence over children when both are provided. */
  label?: string;
  /** String children as an alternative to the label prop. */
  children?: string;
  /**
   * @default 'default'
   */
  variant?: BadgeVariant;
  /**
   * @default 'md'
   */
  size?: BadgeSize;
  background?: string;
  color?: string;
}

const createBadgeStyles = (t: PdfcnTheme) => {
  const { spacing, borderRadius, fontWeights } = t.primitives;
  const c = t.colors;
  const textBase = {
    fontFamily: t.typography.body.fontFamily,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.3,
  };
  const variantBox = (borderColor: string, bgColor: string = c.muted) => ({
    backgroundColor: bgColor,
    borderColor,
    borderStyle: "solid" as const,
    borderWidth: spacing[0.5],
  });
  const sheet = StyleSheet.create({
    containerBase: {
      alignItems: "center" as const,
      alignSelf: "flex-start" as const,
      borderRadius: borderRadius.full,
      flexDirection: "row" as const,
    },
    sizeLg: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
    sizeMd: { paddingHorizontal: spacing[3], paddingVertical: spacing[1] },
    sizeSm: { paddingHorizontal: spacing[2], paddingVertical: spacing[0.5] },
    textDefault: { ...textBase, color: c.mutedForeground },
    textDestructive: { ...textBase, color: c.destructive },
    textInfo: { ...textBase, color: c.info },
    textLg: { fontSize: t.primitives.typography.sm },
    textMd: { fontSize: t.primitives.typography.xs },
    textOutline: { ...textBase, color: c.foreground },
    textPrimary: { ...textBase, color: c.primaryForeground },
    textSm: { fontSize: t.primitives.typography.xs - 1 },
    textSuccess: { ...textBase, color: c.success },
    textWarning: { ...textBase, color: c.warning },
    variantDefault: variantBox(c.border),
    variantDestructive: variantBox(c.destructive),
    variantInfo: variantBox(c.info),
    variantOutline: variantBox(c.border, c.background),
    variantPrimary: variantBox(c.primary, c.primary),
    variantSuccess: variantBox(c.success),
    variantWarning: variantBox(c.warning),
  });
  return {
    ...sheet,
    containerSizeMap: {
      lg: sheet.sizeLg,
      md: sheet.sizeMd,
      sm: sheet.sizeSm,
    } as Record<BadgeSize, Style>,
    containerVariantMap: {
      default: sheet.variantDefault,
      destructive: sheet.variantDestructive,
      info: sheet.variantInfo,
      outline: sheet.variantOutline,
      primary: sheet.variantPrimary,
      success: sheet.variantSuccess,
      warning: sheet.variantWarning,
    } as Record<BadgeVariant, Style>,
    textSizeMap: {
      lg: sheet.textLg,
      md: sheet.textMd,
      sm: sheet.textSm,
    } as Record<BadgeSize, Style>,
    textVariantMap: {
      default: sheet.textDefault,
      destructive: sheet.textDestructive,
      info: sheet.textInfo,
      outline: sheet.textOutline,
      primary: sheet.textPrimary,
      success: sheet.textSuccess,
      warning: sheet.textWarning,
    } as Record<BadgeVariant, Style>,
  };
};

export const Badge = ({
  label,
  children,
  variant = "default",
  size = "md",
  background,
  color,
  style,
}: BadgeProps) => {
  const theme = usePdfcnTheme();
  const styles = useSafeMemo(() => createBadgeStyles(theme), [theme]);
  // `label` takes precedence; fall back to string children for React idiom compatibility
  const text = label ?? children ?? "";
  const containerStyles: Style[] = [
    styles.containerBase,
    styles.containerVariantMap[variant],
    styles.containerSizeMap[size],
    ...(background
      ? [{ backgroundColor: resolveColor(background, theme.colors) }]
      : []),
    ...(style ? [style].flat() : []),
  ];
  const textStyles: Style[] = [
    styles.textVariantMap[variant],
    styles.textSizeMap[size],
    ...(color ? [{ color: resolveColor(color, theme.colors) }] : []),
  ];
  return (
    <View style={containerStyles}>
      <PDFText style={textStyles}>{text}</PDFText>
    </View>
  );
};
