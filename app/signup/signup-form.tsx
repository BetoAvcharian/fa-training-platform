'use client'

import { useState, useTransition } from 'react'
import { signUpManagerAction, signUpCoachAction, signUpAthleteAction, lookupCoachesByJoinCodeAction } from './actions'
import type { CoachDirectoryEntry } from '@/domains/athletes/types'

const inputClass = 'w-full rounded-lg border border-outline bg-panel text-ink px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold'

export function SignupForm({ defaultRole, errorMessage }: { defaultRole?: string; errorMessage?: string }) {
  const [role, setRole] = useState<'manager' | 'coach' | 'athlete'>((defaultRole as 'manager' | 'coach' | 'athlete') ?? 'manager')
  const [athleteCode, setAthleteCode] = useState('')
  const [athleteCoaches, setAthleteCoaches] = useState<CoachDirectoryEntry[]>([])
  const [codeStatus, setCodeStatus] = useState<'idle' | 'buscando' | 'encontrado' | 'sin-resultado'>('idle')
  const [, startCodeLookup] = useTransition()

  const action = role === 'manager' ? signUpManagerAction : role === 'coach' ? signUpCoachAction : signUpAthleteAction

  function handleAthleteCodeChange(value: string) {
    setAthleteCode(value)
    setAthleteCoaches([])
    if (value.trim().length < 4) {
      setCodeStatus('idle')
      return
    }
    setCodeStatus('buscando')
    startCodeLookup(async () => {
      const coaches = await lookupCoachesByJoinCodeAction(value)
      setAthleteCoaches(coaches)
      setCodeStatus(coaches.length > 0 ? 'encontrado' : 'sin-resultado')
    })
  }

  return (
    <form action={action} className="space-y-3">
      <div className="flex gap-2 text-xs mb-2">
        {(['manager', 'coach', 'athlete'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`flex-1 py-2 rounded-lg border ${
              role === r ? 'bg-navy text-white border-navy' : 'border-outline text-status-neutral'
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
        <div className="space-y-3">
          <div>
            <input
              value={athleteCode}
              onChange={(e) => handleAthleteCodeChange(e.target.value)}
              placeholder="Código de equipo"
              maxLength={6}
              className={`${inputClass} uppercase`}
            />
            <p className="text-[11px] text-status-neutral mt-1">Te lo pasa tu entrenador o el manager de tu club.</p>
          </div>

          {codeStatus === 'buscando' && <p className="text-xs text-status-neutral">Buscando...</p>}
          {codeStatus === 'sin-resultado' && <p className="text-xs text-status-critical">Ese código no existe. Revisalo con tu club.</p>}

          {codeStatus === 'encontrado' && (
            <select name="coachMembershipId" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Elegí tu entrenador
              </option>
              {athleteCoaches.map((c) => (
                <option key={c.membershipId} value={c.membershipId}>
                  {c.name} — {c.organizationName}
                </option>
              ))}
            </select>
          )}

          {codeStatus === 'encontrado' && (
            <div className="pt-2 border-t border-outline space-y-2">
              <p className="text-xs font-semibold text-status-neutral uppercase tracking-wide">Tu perfil</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-status-neutral block mb-1">Fecha de nacimiento</label>
                  <input name="birthDate" type="date" className={inputClass} />
                </div>
                <div>
                  <label className="text-[11px] text-status-neutral block mb-1">Género</label>
                  <select name="gender" className={inputClass} defaultValue="">
                    <option value="">Sin especificar</option>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                  </select>
                </div>
              </div>
              <input name="phone" placeholder="Teléfono (opcional)" className={inputClass} />
              <input name="club" placeholder="Club (opcional)" className={inputClass} />
              <p className="text-[11px] text-status-neutral">
                El género se usa para calcular tu puntaje World Athletics correctamente — lo demás lo podés completar después.
              </p>
            </div>
          )}
        </div>
      )}

      {errorMessage && <p className="text-sm text-status-critical">{errorMessage}</p>}

      <button
        type="submit"
        disabled={role === 'athlete' && codeStatus !== 'encontrado'}
        className="w-full btn-primary py-2.5 text-sm disabled:opacity-50"
      >
        Crear cuenta
      </button>
    </form>
  )
}
