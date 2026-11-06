import webConfig from "../../apps/web/vite.config"

export default {
  check: webConfig.check,
  fmt: {
    ...webConfig.fmt,
    ignorePatterns: webConfig.fmt?.ignorePatterns?.filter(
      (pattern) => pattern !== "articles"
    ),
  },
  lint: webConfig.lint,
}
