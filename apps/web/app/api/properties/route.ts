import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  getPropertyCatalog,
  getPropertyDetails,
  searchProperties,
} from "@/lib/properties/data"
import { DATASETS, FILTER_OPERATORS } from "@/lib/properties/types"

const input = z.object({
  dataset: z.enum(DATASETS).default("blocks"),
  mode: z.enum(["catalog", "entries", "details"]).default("entries"),
  q: z.string().max(200).default(""),
  columns: z.string().max(1000).default(""),
  filters: z
    .string()
    .max(3000)
    .default("[]")
    .transform((text, ctx) => {
      try {
        return JSON.parse(text) as unknown
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid filters" })
        return z.NEVER
      }
    })
    .pipe(
      z
        .array(
          z.object({
            id: z.string().max(50),
            property: z.string().max(150),
            operator: z.enum(FILTER_OPERATORS),
            value: z.string().max(200),
          })
        )
        .max(8)
    ),
  sort: z.string().max(150).default(""),
  direction: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  names: z
    .string()
    .max(2000)
    .default("[]")
    .transform((text, ctx) => {
      try {
        return JSON.parse(text) as unknown
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid names" })
        return z.NEVER
      }
    })
    .pipe(z.array(z.string().max(200)).max(4)),
})

export async function GET(request: NextRequest) {
  const parsed = input.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  )
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid lookup parameters" },
      { status: 400 }
    )
  }
  const options = parsed.data
  const data =
    options.mode === "catalog"
      ? await getPropertyCatalog(options.dataset)
      : options.mode === "details"
        ? await getPropertyDetails(options.dataset, options.names)
        : await searchProperties(options.dataset, {
            query: options.q,
            columns: options.columns.split(",").filter(Boolean),
            filters: options.filters,
            sort: options.sort,
            descending: options.direction === "desc",
            page: options.page,
          })
  return NextResponse.json(data, {
    headers: {
      "Cache-Control":
        "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
    },
  })
}
