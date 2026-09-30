import type { ReactNode } from "react";

import {
  usePdfcnTheme,
  useSafeMemo,
} from "@/components/pdf/theme-provider";
import {
  Text as PDFText,
  StyleSheet,
  View,
} from "@/lib/pdf-primitives";
import type { Style } from "@/lib/pdf-primitives";
import { resolveColor } from "@/lib/resolve-color";
import type { PDFComponentProps } from "@/types/pdf-components";
import type { PdfcnTheme } from "@/types/pdf-themes";

export type PageHeaderVariant =
  | "simple"
  | "centered"
  | "minimal"
  | "branded"
  | "logo-left"
  | "logo-right"
  | "two-column";

/**
 * Header row with layout variants, logo support, and optional fixed positioning.
 * Props - `title` | `subtitle` | `rightText` | `rightSubText` | `variant` | `background` | `titleColor` | `marginBottom` | `address` | `phone` | `email` | `logo` | `fixed` | `noWrap` | `style`
 * @see {@link PageHeaderProps}
 */
export interface PageHeaderProps extends Omit<PDFComponentProps, "children"> {
  title: string;
  subtitle?: string;
  rightText?: string;
  rightSubText?: string;
  /**
   * @default 'simple'
   */
  variant?: PageHeaderVariant;
  background?: string;
  titleColor?: string;
  marginBottom?: number;
  address?: string;
  phone?: string;
  email?: string;
  logo?: ReactNode;
  /**
   * @default false
   */
  fixed?: boolean;
  /**
   * @default true
   */
  noWrap?: boolean;
}

const createPageHeaderStyles = (t: PdfcnTheme) => {
  const { spacing, borderRadius, fontWeights } = t.primitives;
  const c = t.colors;
  const { heading, body } = t.typography;

  return StyleSheet.create({
    brandedContainer: {
      alignItems: "center",
      backgroundColor: c.primary,
      borderRadius: borderRadius.sm,
      display: "flex",
      flexDirection: "column",
      padding: spacing[6],
    },
    centeredContainer: {
      alignItems: "center",
      borderBottomColor: c.border,
      borderBottomStyle: "solid",
      borderBottomWidth: spacing[0.5],
      display: "flex",
      flexDirection: "column",
      paddingBottom: spacing[4],
    },
    contactInfo: {
      color: c.mutedForeground,
      fontFamily: body.fontFamily,
      fontSize: t.primitives.typography.xs,
      marginTop: spacing[0.5],
      textAlign: "right",
    },

    logoContainer: {
      height: 48,
      marginRight: spacing[4],
      width: 48,
    },

    logoContent: {
      display: "flex",
      flex: 1,
      flexDirection: "column",
    },
    logoLeftContainer: {
      alignItems: "center",
      borderBottomColor: c.border,
      borderBottomStyle: "solid",
      borderBottomWidth: spacing[0.5],
      display: "flex",
      flexDirection: "row",
      paddingBottom: spacing[4],
    },
    logoRightContainer: {
      alignItems: "center",
      borderBottomColor: c.border,
      borderBottomStyle: "solid",
      borderBottomWidth: spacing[0.5],
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: spacing[4],
    },

    logoRightContent: {
      display: "flex",
      flex: 1,
      flexDirection: "column",
    },

    logoRightLogoContainer: {
      height: 48,
      marginLeft: spacing[4],
      width: 48,
    },
    minimalContainer: {
      alignItems: "center",
      borderBottomColor: c.primary,
      borderBottomStyle: "solid",
      borderBottomWidth: spacing[1],
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: spacing[3],
    },
    minimalLeft: {
      flex: 1,
    },
    minimalRight: {
      alignItems: "flex-end",
    },

    rightSubText: {
      color: c.mutedForeground,
      fontFamily: body.fontFamily,
      fontSize: t.primitives.typography.xs,
      marginTop: spacing[1],
      textAlign: "right",
    },
    rightText: {
      color: c.foreground,
      fontFamily: body.fontFamily,
      fontSize: body.fontSize,
      fontWeight: fontWeights.medium,
      textAlign: "right",
    },
    simpleContainer: {
      alignItems: "flex-start",
      borderBottomColor: c.border,
      borderBottomStyle: "solid",
      borderBottomWidth: spacing[0.5],
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: spacing[4],
    },

    simpleLeft: {
      display: "flex",
      flex: 1,
      flexDirection: "column",
    },
    simpleRight: {
      alignItems: "flex-end",
      display: "flex",
      flexDirection: "column",
    },

    subtitle: {
      color: c.mutedForeground,
      fontFamily: body.fontFamily,
      fontSize: body.fontSize,
      lineHeight: body.lineHeight,
      marginTop: spacing[1],
    },
    subtitleBranded: {
      color: c.primaryForeground,
      marginTop: spacing[1],
    },
    subtitleCentered: {
      textAlign: "center",
    },

    title: {
      color: c.foreground,
      fontFamily: heading.fontFamily,
      fontSize: heading.fontSize.h3,
      fontWeight: fontWeights.bold,
      lineHeight: heading.lineHeight,
      marginBottom: 0,
    },
    titleBranded: {
      color: c.primaryForeground,
    },
    titleCentered: {
      textAlign: "center",
    },

    titleMinimal: {
      fontSize: heading.fontSize.h3,
      fontWeight: fontWeights.bold,
    },
    twoColumnContainer: {
      alignItems: "flex-start",
      borderBottomColor: c.border,
      borderBottomStyle: "solid",
      borderBottomWidth: spacing[0.5],
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: spacing[4],
    },
    twoColumnLeft: {
      display: "flex",
      flex: 1,
      flexDirection: "column",
    },
    twoColumnRight: {
      alignItems: "flex-end",
      display: "flex",
      flexDirection: "column",
    },
  });
};

type Styles = ReturnType<typeof createPageHeaderStyles>;

const buildContainerStyles = (
  base: Style,
  mb: number,
  background: string | undefined,
  theme: PdfcnTheme,
  style: Style | undefined,
  ...extras: Style[]
): Style[] => {
  const result: Style[] = [base, { marginBottom: mb }, ...extras];
  if (background) {
    result.push({ backgroundColor: resolveColor(background, theme.colors) });
  }
  if (style) {
    result.push(style);
  }
  return result;
};

const buildTitleStyles = (
  base: Style[],
  titleColor: string | undefined,
  theme: PdfcnTheme
): Style[] => {
  if (!titleColor) {
    return base;
  }
  return [...base, { color: resolveColor(titleColor, theme.colors) }];
};

const renderBranded = (
  styles: Styles,
  containerStyles: Style[],
  titleStyles: Style[],
  title: string,
  subtitle: string | undefined,
  noWrap: boolean
) => (
  <View wrap={!noWrap} style={containerStyles}>
    <PDFText style={titleStyles}>{title}</PDFText>
    {subtitle && (
      <PDFText style={[styles.subtitle, styles.subtitleBranded]}>
        {subtitle}
      </PDFText>
    )}
  </View>
);

const renderCentered = (
  styles: Styles,
  containerStyles: Style[],
  titleStyles: Style[],
  title: string,
  subtitle: string | undefined,
  noWrap: boolean
) => (
  <View wrap={!noWrap} style={containerStyles}>
    <PDFText style={titleStyles}>{title}</PDFText>
    {subtitle && (
      <PDFText style={[styles.subtitle, styles.subtitleCentered]}>
        {subtitle}
      </PDFText>
    )}
  </View>
);

const renderLogoRight = (
  styles: Styles,
  containerStyles: Style[],
  titleStyles: Style[],
  title: string,
  subtitle: string | undefined,
  logo: ReactNode | undefined,
  noWrap: boolean
) => (
  <View wrap={!noWrap} style={containerStyles}>
    <View style={styles.logoRightContent}>
      <PDFText style={titleStyles}>{title}</PDFText>
      {subtitle && <PDFText style={styles.subtitle}>{subtitle}</PDFText>}
    </View>
    {logo && <View style={styles.logoRightLogoContainer}>{logo}</View>}
  </View>
);

const renderLogoLeft = (
  styles: Styles,
  containerStyles: Style[],
  titleStyles: Style[],
  title: string,
  subtitle: string | undefined,
  logo: ReactNode | undefined,
  rightText: string | undefined,
  rightSubText: string | undefined,
  noWrap: boolean
) => (
  <View wrap={!noWrap} style={containerStyles}>
    {logo && <View style={styles.logoContainer}>{logo}</View>}
    <View style={styles.logoContent}>
      <PDFText style={titleStyles}>{title}</PDFText>
      {subtitle && <PDFText style={styles.subtitle}>{subtitle}</PDFText>}
    </View>
    {(rightText || rightSubText) && (
      <View style={styles.simpleRight}>
        {rightText && <PDFText style={styles.rightText}>{rightText}</PDFText>}
        {rightSubText && (
          <PDFText style={styles.rightSubText}>{rightSubText}</PDFText>
        )}
      </View>
    )}
  </View>
);

const renderTwoColumn = (
  styles: Styles,
  containerStyles: Style[],
  titleStyles: Style[],
  title: string,
  subtitle: string | undefined,
  address: string | undefined,
  phone: string | undefined,
  email: string | undefined,
  noWrap: boolean
) => (
  <View wrap={!noWrap} style={containerStyles}>
    <View style={styles.twoColumnLeft}>
      <PDFText style={titleStyles}>{title}</PDFText>
      {subtitle && <PDFText style={styles.subtitle}>{subtitle}</PDFText>}
    </View>
    {(address || phone || email) && (
      <View style={styles.twoColumnRight}>
        {address && <PDFText style={styles.contactInfo}>{address}</PDFText>}
        {phone && <PDFText style={styles.contactInfo}>{phone}</PDFText>}
        {email && <PDFText style={styles.contactInfo}>{email}</PDFText>}
      </View>
    )}
  </View>
);

const renderMinimal = (
  styles: Styles,
  containerStyles: Style[],
  titleStyles: Style[],
  title: string,
  subtitle: string | undefined,
  rightText: string | undefined,
  rightSubText: string | undefined,
  noWrap: boolean
) => (
  <View wrap={!noWrap} style={containerStyles}>
    <View style={styles.minimalLeft}>
      <PDFText style={titleStyles}>{title}</PDFText>
      {subtitle && <PDFText style={styles.subtitle}>{subtitle}</PDFText>}
    </View>
    {(rightText || rightSubText) && (
      <View style={styles.minimalRight}>
        {rightText && <PDFText style={styles.rightText}>{rightText}</PDFText>}
        {rightSubText && (
          <PDFText style={styles.rightSubText}>{rightSubText}</PDFText>
        )}
      </View>
    )}
  </View>
);

const renderSimple = (
  styles: Styles,
  containerStyles: Style[],
  titleStyles: Style[],
  title: string,
  subtitle: string | undefined,
  rightText: string | undefined,
  rightSubText: string | undefined,
  noWrap: boolean
) => (
  <View wrap={!noWrap} style={containerStyles}>
    <View style={styles.simpleLeft}>
      <PDFText style={titleStyles}>{title}</PDFText>
      {subtitle && <PDFText style={styles.subtitle}>{subtitle}</PDFText>}
    </View>
    {(rightText || rightSubText) && (
      <View style={styles.simpleRight}>
        {rightText && <PDFText style={styles.rightText}>{rightText}</PDFText>}
        {rightSubText && (
          <PDFText style={styles.rightSubText}>{rightSubText}</PDFText>
        )}
      </View>
    )}
  </View>
);

export const PageHeader = ({
  title,
  subtitle,
  rightText,
  rightSubText,
  variant = "simple",
  background,
  titleColor,
  marginBottom,
  logo,
  address,
  phone,
  email,
  noWrap = true,
  style,
}: PageHeaderProps) => {
  const theme = usePdfcnTheme();
  const styles = useSafeMemo(() => createPageHeaderStyles(theme), [theme]);
  const mb = marginBottom ?? theme.spacing.sectionGap;

  const variantRenderers: Record<PageHeaderVariant, () => React.ReactNode> = {
    branded: () =>
      renderBranded(
        styles,
        buildContainerStyles(
          styles.brandedContainer,
          mb,
          background,
          theme,
          style
        ),
        buildTitleStyles(
          [styles.title, styles.titleBranded, styles.titleCentered],
          titleColor,
          theme
        ),
        title,
        subtitle,
        noWrap
      ),
    centered: () =>
      renderCentered(
        styles,
        buildContainerStyles(
          styles.centeredContainer,
          mb,
          background,
          theme,
          style
        ),
        buildTitleStyles(
          [styles.title, styles.titleCentered],
          titleColor,
          theme
        ),
        title,
        subtitle,
        noWrap
      ),
    "logo-left": () =>
      renderLogoLeft(
        styles,
        buildContainerStyles(
          styles.logoLeftContainer,
          mb,
          background,
          theme,
          style
        ),
        buildTitleStyles([styles.title], titleColor, theme),
        title,
        subtitle,
        logo,
        rightText,
        rightSubText,
        noWrap
      ),
    "logo-right": () =>
      renderLogoRight(
        styles,
        buildContainerStyles(
          styles.logoRightContainer,
          mb,
          background,
          theme,
          style
        ),
        buildTitleStyles([styles.title], titleColor, theme),
        title,
        subtitle,
        logo,
        noWrap
      ),
    minimal: () =>
      renderMinimal(
        styles,
        buildContainerStyles(
          styles.minimalContainer,
          mb,
          background,
          theme,
          style
        ),
        buildTitleStyles(
          [styles.title, styles.titleMinimal],
          titleColor,
          theme
        ),
        title,
        subtitle,
        rightText,
        rightSubText,
        noWrap
      ),
    simple: () =>
      renderSimple(
        styles,
        buildContainerStyles(
          styles.simpleContainer,
          mb,
          background,
          theme,
          style
        ),
        buildTitleStyles([styles.title], titleColor, theme),
        title,
        subtitle,
        rightText,
        rightSubText,
        noWrap
      ),
    "two-column": () =>
      renderTwoColumn(
        styles,
        buildContainerStyles(
          styles.twoColumnContainer,
          mb,
          background,
          theme,
          style
        ),
        buildTitleStyles([styles.title], titleColor, theme),
        title,
        subtitle,
        address,
        phone,
        email,
        noWrap
      ),
  };

  return variantRenderers[variant]() as React.ReactNode;
};
