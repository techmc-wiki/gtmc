"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { createDocument } from "@/actions/sidebar"
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
              Title
            </label>
            <input
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
              className="
                w-full border border-tech-main/40 bg-tech-main/5 px-3 py-2
                text-sm text-tech-main outline-none
                focus:border-tech-main
              "
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
              Slug (URL path)
            </label>
            <input
              id="modal-slug"
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              className="
                w-full border border-tech-main/40 bg-tech-main/5 px-3 py-2
                text-sm text-tech-main outline-none
                focus:border-tech-main
              "
              placeholder="Leave empty to auto-generate"
            />
          </div>

          <div
            className="
              flex items-center gap-3 border guide-line bg-tech-main/5 px-3 py-2
            ">
            <input
              type="checkbox"
              id="isFolder"
              checked={formData.isFolder}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  isFolder: e.target.checked,
                })
              }
              className="size-4 accent-tech-main"
            />
            <label
              htmlFor="isFolder"
              className="cursor-pointer text-sm text-tech-main/80 select-none">
              Create as Directory (Folder)
            </label>
          </div>

          <div>
            <label
              htmlFor="modal-parent"
              className="
                mb-1 block text-[0.6875rem] tracking-wider text-tech-main/80
                uppercase
              ">
              Parent Directory
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
              <option value="">[ ROOT_DIRECTORY ]</option>
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
              ABORT
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
              EXECUTE
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
