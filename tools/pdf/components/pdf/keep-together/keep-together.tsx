import type { ReactNode } from "react";

import { View } from "@/lib/pdf-primitives";
import type { Style } from "@/types/pdf-components";

export interface KeepTogetherProps {
  children?: ReactNode;
  minPresenceAhead?: number;
  style?: Style;
}

export const KeepTogether = ({ children, style }: KeepTogetherProps) => (
  <View style={[{ breakInside: "avoid" }, style].filter(Boolean) as never}>
    {children}
  </View>
);
