'use client'

import { useState } from 'react'
import { signUpManagerAction, signUpCoachAction, signUpAthleteAction } from './actions'
import type { CoachDirectoryEntry } from '@/domains/athletes/types'

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold'

export function SignupForm({
  coaches,
  defaultRole,
  errorMessage,
}: {
  coaches: CoachDirectoryEntry[]
  defaultRole?: string
  errorMessage?: string
}) {
  const [role, setRole] = useState<'manager' | 'coach' | 'athlete'>((defaultRole as any) ?? 'manager')

  const action = role === 'manager' ? signUpManagerAction : role === 'coach' ? signUpCoachAction : signUpAthleteAction

  return (
    <form action={action} className="space-y-3">
      <div className="flex gap-2 text-xs mb-2">
        {(['manager', 'coach', 'athlete'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`flex-1 py-2 rounded-lg border ${
              role === r ? 'bg-navy text-white border-navy' : 'border-gray-300 text-status-neutral'
            }`}
          >
            {r === 'manager' ? 'Manager' : r === 'coach' ? 'Entrenador' : 'Atleta'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input name="firstName" placeholder="Nombre" required className={inputClass} />
        <input name="lastName" placeholder="Apellido" required className={inputClass} />
      </div>
      <input name="email" type="email" placeholder="Email" required className={inputClass} />
      <input name="password" type="password" placeholder="Contraseña (mín. 6 caracteres)" required minLength={6} className={inputClass} />

      {role === 'manager' && (
        <div>
          <input name="organizationName" placeholder="Nombre de tu club o equipo" required className={inputClass} />
          <p className="text-[11px] text-status-neutral mt-1">
            Se crea un equipo nuevo y te genera un código para sumar entrenadores.
          </p>
        </div>
      )}

      {role === 'coach' && (
        <div>
          <input
            name="joinCode"
            placeholder="Código de equipo"
            required
            maxLength={6}
            className={`${inputClass} uppercase`}
          />
          <p className="text-[11px] text-status-neutral mt-1">Te lo pasa el manager de tu club.</p>
        </div>
      )}

      {role === 'athlete' && (
        <select name="coachMembershipId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Elegí tu entrenador
          </option>
          {coaches.map((c) => (
            <option key={c.membershipId} value={c.membershipId}>
              {c.name} — {c.organizationName}
            </option>
          ))}
        </select>
      )}

      {errorMessage && <p className="text-sm text-status-critical">{errorMessage}</p>}

      <button type="submit" className="w-full btn-primary py-2.5 text-sm">
        Crear cuenta
      </button>
    </form>
  )
}
