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

export type DividerVariant = "solid" | "dashed" | "dotted";
export type DividerThickness = "thin" | "medium" | "thick";
export type DividerSpacing = "none" | "sm" | "md" | "lg";

/**
 * Horizontal rule with optional label, style variants, and spacing presets.
 * Props - `spacing` | `variant` | `color` | `thickness` | `label` | `width` | `style`
 * @see {@link DividerProps}
 */
export interface DividerProps extends Omit<PDFComponentProps, "children"> {
  /**
   * @default 'md'
   */
  spacing?: DividerSpacing;
  /**
   * @default 'solid'
   */
  variant?: DividerVariant;
  color?: string;
  /**
   * @default 'thin'
   */
  thickness?: DividerThickness;
  label?: string;
  width?: string | number;
}

const createDividerStyles = (t: PdfcnTheme) => {
  const { spacing, fontWeights } = t.primitives;
  return StyleSheet.create({
    base: { borderBottomColor: t.colors.border, borderBottomStyle: "solid" },
    dashed: { borderBottomStyle: "dashed" },
    dotted: { borderBottomStyle: "dotted" },
    labelContainer: { alignItems: "center", flexDirection: "row" },
    labelLine: {
      borderBottomColor: t.colors.border,
      borderBottomStyle: "solid",
      flex: 1,
    },
    labelText: {
      color: t.colors.mutedForeground,
      fontFamily: t.typography.body.fontFamily,
      fontSize: t.primitives.typography.xs,
      fontWeight: fontWeights.medium,
      letterSpacing: t.primitives.letterSpacing.wider * 10,
      paddingHorizontal: spacing[3],
      textTransform: "uppercase",
    },
    medium: { borderBottomWidth: spacing[1] },
    solid: { borderBottomStyle: "solid" },
    spacingLg: { marginVertical: t.spacing.sectionGap },
    spacingMd: { marginVertical: t.spacing.componentGap },
    spacingNone: { marginVertical: spacing[0] },
    spacingSm: { marginVertical: t.spacing.paragraphGap },
    thick: { borderBottomWidth: spacing[2] },
    thin: { borderBottomWidth: spacing[0.5] },
  });
};

export const Divider = ({
  spacing = "md",
  variant = "solid",
  color,
  thickness = "thin",
  label,
  width,
  style,
}: DividerProps) => {
  const theme = usePdfcnTheme();
  const styles = useSafeMemo(() => createDividerStyles(theme), [theme]);
  const spacingMap = {
    lg: styles.spacingLg,
    md: styles.spacingMd,
    none: styles.spacingNone,
    sm: styles.spacingSm,
  };
  const variantMap = {
    dashed: styles.dashed,
    dotted: styles.dotted,
    solid: styles.solid,
  };
  const thicknessMap = {
    medium: styles.medium,
    thick: styles.thick,
    thin: styles.thin,
  };

  if (label) {
    const lineStyle: Style[] = [
      styles.labelLine,
      thicknessMap[thickness],
      variantMap[variant],
    ];
    if (color) {
      lineStyle.push({ borderBottomColor: resolveColor(color, theme.colors) });
    }
    const containerStyles: Style[] = [
      styles.labelContainer,
      spacingMap[spacing],
    ];
    if (width !== undefined) {
      containerStyles.push({ width } as Style);
    }
    if (style) {
      containerStyles.push(...[style].flat());
    }
    const labelTextStyle: Style[] = [styles.labelText];
    if (color) {
      labelTextStyle.push({ color: resolveColor(color, theme.colors) });
    }
    return (
      <View style={containerStyles}>
        <View style={lineStyle} />
        <PDFText style={labelTextStyle}>{label}</PDFText>
        <View style={lineStyle} />
      </View>
    );
  }

  const styleArray: Style[] = [
    styles.base,
    spacingMap[spacing],
    variantMap[variant],
    thicknessMap[thickness],
  ];
  if (color) {
    styleArray.push({ borderBottomColor: resolveColor(color, theme.colors) });
  }
  if (width !== undefined) {
    styleArray.push({ width } as Style);
  }
  if (style) {
    styleArray.push(...[style].flat());
  }
  return <View style={styleArray} />;
};
