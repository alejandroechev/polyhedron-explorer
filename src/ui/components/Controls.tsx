import type { ColorMode, RenderOptions } from '../../render/polyhedronMesh'

interface ControlsProps {
  readonly options: RenderOptions
  readonly onChange: (patch: Partial<RenderOptions>) => void
  readonly autoRotate: boolean
  readonly onAutoRotateChange: (value: boolean) => void
  readonly showDual: boolean
  readonly onShowDualChange: (value: boolean) => void
  readonly onReset: () => void
  readonly rupertAvailable: boolean
  readonly rupertMessage: string
  readonly showRupert: boolean
  readonly onShowRupertChange: (value: boolean) => void
  readonly passagePaused: boolean
  readonly onPassagePausedChange: (value: boolean) => void
}

function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5 text-sm text-slate-300">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-sky-400"
      />
    </label>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="block py-1.5 text-sm text-slate-300">
      <span className="mb-1 flex justify-between">
        <span>{label}</span>
        <span className="text-xs text-slate-500">{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-sky-400"
      />
    </label>
  )
}

const COLOR_MODES: { value: ColorMode; label: string }[] = [
  { value: 'faceType', label: 'By face type' },
  { value: 'component', label: 'By component' },
  { value: 'rainbow', label: 'Rainbow' },
  { value: 'symmetry', label: 'Hue by sides' },
  { value: 'single', label: 'Single colour' },
]

/** Rendering and view controls, mirroring Stella's display options. */
export default function Controls({
  options,
  onChange,
  autoRotate,
  onAutoRotateChange,
  showDual,
  onShowDualChange,
  onReset,
  rupertAvailable,
  rupertMessage,
  showRupert,
  onShowRupertChange,
  passagePaused,
  onPassagePausedChange,
}: ControlsProps) {
  return (
    <div className="space-y-3 p-4">
      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Rupert passage
        </h3>
        <Toggle label="Show Rupert passage" checked={showRupert} onChange={onShowRupertChange} disabled={!rupertAvailable} />
        <p role="status" className="text-xs text-slate-400">{rupertMessage}</p>
        {showRupert && (
          <Toggle label="Pause passage" checked={passagePaused} onChange={onPassagePausedChange} />
        )}
      </section>
      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Display
        </h3>
        <Toggle
          label="Faces"
          checked={options.showFaces}
          onChange={(v) => onChange({ showFaces: v })}
        />
        <Toggle
          label="Edges"
          checked={options.showEdges}
          onChange={(v) => onChange({ showEdges: v })}
        />
        <Toggle
          label="Vertices"
          checked={options.showVertices}
          onChange={(v) => onChange({ showVertices: v })}
        />
        <Toggle label="Spin" checked={autoRotate} onChange={onAutoRotateChange} />
        <Toggle label="Show dual" checked={showDual} onChange={onShowDualChange} />
      </section>

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Appearance
        </h3>
        <label className="block py-1.5 text-sm text-slate-300">
          <span className="mb-1 block">Colouring</span>
          <select
            disabled={showRupert}
            value={options.colorMode}
            onChange={(e) => onChange({ colorMode: e.target.value as ColorMode })}
            className="w-full rounded-md border border-[var(--color-surface-border)] bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-sky-500"
          >
            {COLOR_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <Slider
          label="Opacity"
          value={options.opacity}
          min={0.15}
          max={1}
          step={0.05}
          onChange={(v) => onChange({ opacity: v })}
        />
        <fieldset disabled={showRupert}>
          <Slider
            label="Explode faces"
            value={options.explode}
            min={0}
            max={1.5}
            step={0.05}
            onChange={(v) => onChange({ explode: v })}
          />
        </fieldset>
        {showRupert && <p className="text-xs text-slate-400">Passage mode uses two fixed colours and assembled faces. Your normal display settings are preserved.</p>}
        <Slider
          label="Metalness"
          value={options.metalness}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => onChange({ metalness: v })}
        />
      </section>

      <button
        type="button"
        onClick={onReset}
        className="w-full rounded-md border border-[var(--color-surface-border)] bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
      >
        Reset view
      </button>
    </div>
  )
}
