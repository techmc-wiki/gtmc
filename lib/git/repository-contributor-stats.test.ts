import { describe, expect, it } from "vite-plus/test"
import {
  calculateRepositoryContributorStats,
  parseRepositoryLog,
} from "./repository-contributor-stats"

describe("parseRepositoryLog", () => {
  it("sums inserted and deleted lines for each commit", () => {
    const log = [
      "__GTMC_COMMIT__\u001f4rcadia\u001f97033226+Arcadi4@users.noreply.github.com",
      "",
      "12\t3\tapp/page.tsx",
      "-\t-\tpublic/image.png",
      "__GTMC_COMMIT__\u001f4rcadia\u001f97033226+Arcadi4@users.noreply.github.com",
      "",
      "4\t1\tlib/data.ts",
    ].join("\n")

    expect(parseRepositoryLog(log)).toEqual([
      {
        authorName: "4rcadia",
        authorEmail: "97033226+Arcadi4@users.noreply.github.com",
        linesChanged: 15,
      },
      {
        authorName: "4rcadia",
        authorEmail: "97033226+Arcadi4@users.noreply.github.com",
        linesChanged: 5,
      },
    ])
  })

  it("matches canonical handles from GitHub no-reply email aliases", () => {
    const repositoryLog = [
      {
        authorName: "4rcadia",
        authorEmail: "97033226+Arcadi4@users.noreply.github.com",
        linesChanged: 15,
      },
      {
        authorName: "Another person",
        authorEmail: "person@example.com",
        linesChanged: 20,
      },
    ]

    expect(
      calculateRepositoryContributorStats(repositoryLog, ["Arcadi4"])
    ).toEqual({ commits: 1, linesChanged: 15 })
  })
})
