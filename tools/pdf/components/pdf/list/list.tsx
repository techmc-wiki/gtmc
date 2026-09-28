import type React from "react";

import {
  usePdfcnTheme,
  useSafeMemo,
} from "@/components/pdf/theme-provider";
import {
  View,
  Text as PDFText,
} from "@/lib/pdf-primitives";
import type { Style } from "@/lib/pdf-primitives";

import { createListStyles } from "./list.styles";
import type { ListItem, ListVariant, PdfListProps } from "./list.types";

type Styles = ReturnType<typeof createListStyles>;
type GapProp = "xs" | "sm" | "md";

const getGapStyle = (gap: GapProp, styles: Styles): Style => {
  if (gap === "xs") {
    return styles.itemRowGapXs;
  }
  if (gap === "md") {
    return styles.itemRowGapMd;
  }
  return styles.itemRowGapSm;
};

const buildRowStyles = (
  index: number,
  total: number,
  gap: GapProp,
  styles: Styles,
  align: "start" | "center" = "start"
): Style[] => {
  const row: Style[] = [
    align === "center" ? styles.itemRowCenter : styles.itemRow,
  ];
  if (index !== total - 1) {
    row.push(getGapStyle(gap, styles));
  }
  return row;
};

/** Bullet dot marker — solid filled for level 0, outline ring for nested levels. */
const dotMarker = (level: number, styles: Styles): React.ReactElement =>
  level === 0 ? (
    <View style={styles.markerBulletWrap}>
      <View style={styles.markerBulletDot} />
    </View>
  ) : (
    <View style={styles.markerBulletSubWrap}>
      <View style={styles.markerBulletSubDot} />
    </View>
  );

// eslint-disable-next-line no-use-before-define, prefer-const
let renderBulletItem: (
  item: ListItem,
  index: number,
  total: number,
  gap: GapProp,
  styles: Styles,
  level: number
) => React.ReactElement;
// eslint-disable-next-line no-use-before-define, prefer-const
let renderMultiLevelItem: (
  item: ListItem,
  index: number,
  total: number,
  gap: GapProp,
  styles: Styles,
  level: number
) => React.ReactElement;

const renderNumberedItem = (
  item: ListItem,
  index: number,
  total: number,
  gap: GapProp,
  styles: Styles
): React.ReactElement => (
  <View key={index} style={buildRowStyles(index, total, gap, styles, "center")}>
    <View style={styles.markerNumberBadge}>
      <PDFText style={styles.markerNumberText}>{`${index + 1}`}</PDFText>
    </View>
    <View style={styles.itemTextWrap}>
      <PDFText style={styles.itemText}>{item.text}</PDFText>
    </View>
  </View>
);

const renderChecklistItem = (
  item: ListItem,
  index: number,
  total: number,
  gap: GapProp,
  styles: Styles
): React.ReactElement => {
  const isChecked = item.checked ?? true;
  return (
    <View
      key={index}
      style={buildRowStyles(index, total, gap, styles, "center")}
    >
      <View
        style={[styles.checkBox, isChecked ? styles.checkBoxChecked : {}]}
      ></View>
      <View style={styles.itemTextWrap}>
        <PDFText style={styles.itemText}>{item.text}</PDFText>
      </View>
    </View>
  );
};

const renderIconItem = (
  item: ListItem,
  index: number,
  total: number,
  gap: GapProp,
  styles: Styles
): React.ReactElement => (
  <View key={index} style={buildRowStyles(index, total, gap, styles, "center")}>
    <View style={styles.iconBox}>
      <PDFText style={styles.iconMark}>★</PDFText>
    </View>
    <View style={styles.itemTextWrap}>
      <PDFText style={styles.itemText}>{item.text}</PDFText>
    </View>
  </View>
);

const renderDescriptiveItem = (
  item: ListItem,
  index: number,
  total: number,
  gap: GapProp,
  styles: Styles
): React.ReactElement => (
  <View key={index} style={buildRowStyles(index, total, gap, styles)}>
    <View style={styles.descriptiveAccent} />
    <View style={styles.descriptiveContent}>
      <PDFText style={styles.descriptiveTitle}>{item.text}</PDFText>
      {item.description ? (
        <PDFText style={styles.descriptiveDesc}>{item.description}</PDFText>
      ) : null}
    </View>
  </View>
);

const renderItem = (
  item: ListItem,
  index: number,
  total: number,
  variant: ListVariant,
  gap: GapProp,
  styles: Styles,
  level: number
): React.ReactElement | null => {
  switch (variant) {
    case "bullet": {
      return renderBulletItem(item, index, total, gap, styles, level);
    }
    case "numbered": {
      return renderNumberedItem(item, index, total, gap, styles);
    }
    case "checklist": {
      return renderChecklistItem(item, index, total, gap, styles);
    }
    case "icon": {
      return renderIconItem(item, index, total, gap, styles);
    }
    case "multi-level": {
      return renderMultiLevelItem(item, index, total, gap, styles, level);
    }
    case "descriptive": {
      return renderDescriptiveItem(item, index, total, gap, styles);
    }
    default: {
      break;
    }
  }
  return null;
};

const renderItemList = (
  items: ListItem[],
  variant: ListVariant,
  gap: GapProp,
  styles: Styles,
  level: number
): React.ReactElement => (
  <View style={level > 0 ? styles.childrenContainer : undefined}>
    {items.map((item, index) =>
      renderItem(item, index, items.length, variant, gap, styles, level)
    )}
  </View>
);

renderBulletItem = (item, index, total, gap, styles, level) => (
  <View key={index}>
    <View style={buildRowStyles(index, total, gap, styles)}>
      {dotMarker(level, styles)}
      <View style={styles.itemTextWrap}>
        <PDFText style={styles.itemText}>{item.text}</PDFText>
      </View>
    </View>
    {item.children && item.children.length > 0
      ? renderItemList(item.children, "bullet", gap, styles, level + 1)
      : null}
  </View>
);

renderMultiLevelItem = (item, index, total, gap, styles, level) => (
  <View key={index}>
    <View style={buildRowStyles(index, total, gap, styles)}>
      {dotMarker(level, styles)}
      <View style={styles.itemTextWrap}>
        <PDFText
          style={[
            level === 0 ? styles.itemText : styles.itemTextSub,
            level === 0 ? styles.itemTextBold : {},
          ]}
        >
          {item.text}
        </PDFText>
      </View>
    </View>
    {item.children && item.children.length > 0
      ? renderItemList(item.children, "multi-level", gap, styles, level + 1)
      : null}
  </View>
);

export const PdfList = ({
  items,
  variant = "bullet",
  gap = "sm",
  style,
  noWrap = false,
  _level = 0,
}: PdfListProps) => {
  const theme = usePdfcnTheme();
  const styles = useSafeMemo(() => createListStyles(theme), [theme]);

  const containerStyles: Style[] = [styles.container];
  if (_level > 0) {
    containerStyles.push(styles.childrenContainer);
  }
  const styleArray = style ? [...containerStyles, style] : containerStyles;

  return (
    <View wrap={!noWrap} style={styleArray}>
      {items.map((item, index) =>
        renderItem(item, index, items.length, variant, gap, styles, _level)
      )}
    </View>
  );
};
