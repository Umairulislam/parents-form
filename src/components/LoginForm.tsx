"use client"

import { useActionState } from "react"
import { login, type LoginState } from "@/lib/auth-actions"

const initialState: LoginState = {}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-ink outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent/15"

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState)

  return (
    <form action={formAction} className="space-y-5">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-white transition hover:bg-accent/90 focus-visible:ring-4 focus-visible:ring-accent/30 focus-visible:outline-none disabled:opacity-60"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  )
}
