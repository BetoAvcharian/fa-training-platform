'use client'

interface RosterOption {
  id: string
  person: { firstName: string; lastName: string } | null
}

/** El <select> de atleta necesita un onChange que mande el form solo —
    eso es interactividad de cliente, no puede vivir en el Server
    Component de la página (causaba "Application error" al abrir). */
export function AthleteFilter({
  roster,
  selectedAthleteId,
  vistaAnual,
}: {
  roster: RosterOption[]
  selectedAthleteId?: string
  vistaAnual: boolean
}) {
  return (
    <form>
      {vistaAnual && <input type="hidden" name="vista" value="anual" />}
      <select
        name="atleta"
        defaultValue={selectedAthleteId ?? ''}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="input-field"
      >
        {roster.length === 0 && <option value="">Sin atletas</option>}
        {roster.map((r) => (
          <option key={r.id} value={r.id}>
            {r.person ? `${r.person.firstName} ${r.person.lastName}` : '—'}
          </option>
        ))}
      </select>
    </form>
  )
}
