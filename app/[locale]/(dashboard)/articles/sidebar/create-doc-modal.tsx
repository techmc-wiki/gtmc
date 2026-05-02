"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { useTranslations } from "next-intl"
import { createDocument } from "@/actions/sidebar"
import { getReauthLoginUrl, isReauthRequiredError } from "@/lib/admin-reauth"
import { InputBox } from "@/components/ui/input-box"
import { SegmentedControl } from "@/components/ui/segmented-control"
import type { TreeNode } from "./tree-node"

export function CreateDocModal({
  open,
  mounted,
  availableFolders,
  onClose,
  onCreated,
}: {
  open: boolean
  mounted: boolean
  availableFolders: TreeNode[]
  onClose: () => void
  onCreated: () => void
}) {
  const t = useTranslations("Sidebar")
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    isFolder: false,
    parentId: "",
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createDocument({
        title: formData.title,
        slug:
          formData.slug || formData.title.toLowerCase().replace(/\s+/g, "-"),
        isFolder: formData.isFolder,
        parentId: formData.parentId || null,
      })
      onClose()
      onCreated()
    } catch (error) {
      if (isReauthRequiredError(error)) {
        window.location.href = getReauthLoginUrl(
          `${window.location.pathname}${window.location.search}`
        )
        return
      }
      const message = error instanceof Error ? error.message : "Unknown error"
      alert(message)
    }
  }

  if (!mounted || !open) return null

  return createPortal(
    <div
      className="
        fixed inset-0 z-9999 flex items-center justify-center bg-black/80 p-4
        duration-300 animate-in fade-in
      ">
      <div
        className="
          w-full max-w-md rounded-sm border-2 border-tech-main bg-white p-6
          shadow-[8px_8px_0_0_rgba(var(--tech-main),1)]
          dark:bg-black
        ">
        <h3
          className="
            mb-6 border-b guide-line pb-2 font-mono text-lg font-bold
            tracking-widest text-tech-main uppercase
          ">
          CREATE_SYS_OBJECT
        </h3>

        <form onSubmit={handleCreate} className="space-y-4 font-mono">
          <div>
            <label
              htmlFor="modal-title"
              className="
                mb-1 block text-[0.6875rem] tracking-wider text-tech-main/80
                uppercase
              ">
              {t("createDocTitleLabel")}
            </label>
            <InputBox
              id="modal-title"
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  title: e.target.value,
                })
              }
              placeholder="e.g. Overview"
            />
          </div>

          <div>
            <label
              htmlFor="modal-slug"
              className="
                mb-1 block text-[0.6875rem] tracking-wider text-tech-main/80
                uppercase
              ">
              {t("createDocSlugLabel")}
            </label>
            <InputBox
              id="modal-slug"
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              placeholder={t("createDocSlugPlaceholder")}
            />
          </div>

          <div>
            <label className="mb-1 block text-[0.6875rem] tracking-wider text-tech-main/80 uppercase">
              {t("createDocAsDirectory")}
            </label>
            <SegmentedControl
              options={[
                { value: "doc", label: t("createDocTypeDocument") },
                { value: "folder", label: t("createDocTypeFolder") },
              ]}
              value={formData.isFolder ? "folder" : "doc"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  isFolder: value === "folder",
                })
              }
              size="sm"
            />
          </div>

          <div>
            <label
              htmlFor="modal-parent"
              className="
                mb-1 block text-[0.6875rem] tracking-wider text-tech-main/80
                uppercase
              ">
              {t("createDocParentDirectory")}
            </label>
            <select
              id="modal-parent"
              value={formData.parentId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  parentId: e.target.value,
                })
              }
              className="
                w-full border border-tech-main/40 bg-tech-main/5 px-3 py-2
                text-sm text-tech-main outline-none
              ">
              <option value="">{t("createDocRootDirectory")}</option>
              {availableFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t guide-line pt-4">
            <button
              type="button"
              onClick={onClose}
              className="
                cursor-pointer border border-tech-main/40 px-4 py-2 text-[0.6875rem]
                font-bold tracking-widest text-tech-main uppercase
                transition-colors
                hover:bg-tech-main/10
              ">
              {t("createDocAbortButton")}
            </button>
            <button
              type="submit"
              className="
                cursor-pointer bg-tech-main px-4 py-2 text-[0.6875rem] font-bold
                tracking-widest text-white uppercase
                shadow-[2px_2px_0_0_rgba(var(--tech-main),0.4)]
                transition-opacity
                hover:opacity-90
              ">
              {t("createDocExecuteButton")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
