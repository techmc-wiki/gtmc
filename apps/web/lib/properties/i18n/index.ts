// eslint-disable-next-line import/no-unassigned-import -- Keep translations and their loader out of browser bundles.
import "server-only"
import zh from "./zh.json"
import { EMPTY_OVERLAY, type Locale, type PropertyOverlay } from "./overlay"

export {
  DEFAULT_LOCALE,
  normalizeLocale,
  translateText,
  translateValue,
  translatedCategory,
  translatedProperty,
  translatedUnit,
} from "./overlay"
export type { Locale, PropertyOverlay } from "./overlay"

const overlays: Partial<Record<Locale, PropertyOverlay>> = {
  zh: zh as PropertyOverlay,
}

export function getPropertyOverlay(locale: Locale): PropertyOverlay {
  return overlays[locale] ?? EMPTY_OVERLAY
}
