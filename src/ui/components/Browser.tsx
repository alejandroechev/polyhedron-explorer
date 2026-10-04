import { useMemo, useState } from 'react'

import {
  searchCatalog,
  type Catalog,
  type CategoryNode,
  type PolyhedronSpec,
} from '../../domain/catalog'

interface BrowserProps {
  readonly catalog: Catalog
  readonly selectedId: string
  readonly onSelect: (id: string) => void
}

function CategoryBranch({
  node,
  depth,
  selectedId,
  onSelect,
  openPaths,
  toggle,
}: {
  node: CategoryNode
  depth: number
  selectedId: string
  onSelect: (id: string) => void
  openPaths: Set<string>
  toggle: (key: string) => void
}) {
  const key = node.path.join('/')
  const open = openPaths.has(key)

  return (
    <li>
      <button
        type="button"
        onClick={() => toggle(key)}
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-white/5"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        aria-expanded={open}
      >
        <span className="w-3 text-slate-500">{open ? '▾' : '▸'}</span>
        <span className="flex-1 font-medium text-slate-200">{node.name}</span>
        <span className="text-xs text-slate-500">{node.count}</span>
      </button>

      {open && (
        <ul>
          {node.children.map((child) => (
            <CategoryBranch
              key={child.path.join('/')}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              openPaths={openPaths}
              toggle={toggle}
            />
          ))}
          {node.specs.map((spec) => (
            <li key={spec.id}>
              <button
                type="button"
                onClick={() => onSelect(spec.id)}
                className={`block w-full truncate rounded px-2 py-1.5 text-left text-sm transition-colors ${
                  spec.id === selectedId
                    ? 'bg-sky-500/20 text-sky-200'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
                style={{ paddingLeft: `${(depth + 1) * 12 + 20}px` }}
              >
                {spec.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/** Category tree plus search. Search replaces the tree while a query is live. */
export default function Browser({ catalog, selectedId, onSelect }: BrowserProps) {
  const [query, setQuery] = useState('')
  const [openPaths, setOpenPaths] = useState<Set<string>>(
    () => new Set(['Uniform', 'Uniform/Regular']),
  )

  const results: PolyhedronSpec[] = useMemo(
    () => searchCatalog(catalog, query).slice(0, 120),
    [catalog, query],
  )

  const toggle = (key: string) => {
    setOpenPaths((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[var(--color-surface-border)] p-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${catalog.specs.length} polyhedra…`}
          className="w-full rounded-md border border-[var(--color-surface-border)] bg-black/30 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-sky-500"
        />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto py-2">
        {query.trim() ? (
          results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No matches.</p>
          ) : (
            <ul>
              {results.map((spec) => (
                <li key={spec.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(spec.id)}
                    className={`block w-full rounded px-3 py-1.5 text-left text-sm ${
                      spec.id === selectedId
                        ? 'bg-sky-500/20 text-sky-200'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="block truncate">{spec.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {spec.categoryPath.join(' › ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ul>
            {catalog.root.children.map((child) => (
              <CategoryBranch
                key={child.path.join('/')}
                node={child}
                depth={0}
                selectedId={selectedId}
                onSelect={onSelect}
                openPaths={openPaths}
                toggle={toggle}
              />
            ))}
          </ul>
        )}
      </nav>
    </div>
  )
}
