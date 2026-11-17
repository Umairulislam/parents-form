"use client"

import { useEffect, useState, useTransition } from "react"
import { AREAS, TOWNS, BOOK_OPTIONS, CLASS_LEVELS } from "@/lib/constants"
import { submitForm } from "@/lib/actions"

type Student = {
  id: string
  student_name: string
  current_class: string
  school_name: string
}

const firstStudent = (): Student => ({
  id: "student-0",
  student_name: "",
  current_class: "",
  school_name: "",
})

const newStudent = (): Student => ({
  id: crypto.randomUUID(),
  student_name: "",
  current_class: "",
  school_name: "",
})

const emptyValues = {
  parent_name: "",
  contact_number: "",
  home_address: "",
  town: "", // new
  area: "",
  book_exchange: "",
  company_url: "", // honeypot
}

const inputClass = (hasError: boolean) =>
  `w-full rounded-xl border bg-white px-4 py-3 text-base text-ink outline-none transition placeholder:text-slate-400 focus:ring-4 ${
    hasError
      ? "border-red-500 focus:border-red-500 focus:ring-red-100"
      : "border-slate-300 focus:border-accent focus:ring-accent/15"
  }`

function Field({
  label,
  error,
  className = "",
  children,
}: {
  label: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {error && (
        <span role="alert" className="mt-1.5 block text-sm text-red-600">
          {error}
        </span>
      )}
    </label>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5 sm:px-6">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}

function SelectField({
  label,
  placeholder,
  options,
  value,
  error,
  onChange,
}: {
  label: string
  placeholder: string
  options: readonly string[]
  value: string
  error?: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
}) {
  return (
    <Field label={label} error={error}>
      <div className="relative">
        <select
          className={`${inputClass(!!error)} appearance-none pr-10`}
          aria-invalid={!!error}
          value={value}
          onChange={onChange}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-slate-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </Field>
  )
}

export default function ParentForm() {
  const [values, setValues] = useState(emptyValues)
  const [students, setStudents] = useState<Student[]>(() => [firstStudent()])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Move focus to the first field with an error
  useEffect(() => {
    if (Object.keys(errors).length === 0) return
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [errors])

  const setValue =
    (key: keyof typeof emptyValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }))

  const updateStudent = (id: string, key: keyof Student, value: string) =>
    setStudents((list) => list.map((s) => (s.id === id ? { ...s, [key]: value } : s)))

  function reset() {
    setValues(emptyValues)
    setStudents([firstStudent()])
    setErrors({})
    setServerError("")
    setDone(false)
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})
    setServerError("")

    startTransition(async () => {
      const result = await submitForm({
        ...values,
        students: students.map(({ student_name, current_class, school_name }) => ({
          student_name,
          current_class,
          school_name,
        })),
      })

      if (result.status === "success") {
        setDone(true)
        window.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        setErrors(result.errors ?? {})
        setServerError(result.message ?? "")
      }
    })
  }

  if (done) {
    return (
      <div className="py-10 text-center sm:py-16">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-pencil/30">
          <svg
            viewBox="0 0 24 24"
            className="size-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h2 className="mt-6 font-display text-2xl font-bold">Registration sent</h2>
        <p className="mx-auto mt-2 max-w-md text-slate-600">
          Thank you. We have received your details. You can close this page.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 rounded-xl border border-slate-300 px-5 py-3 font-semibold transition hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-accent/25 focus-visible:outline-none"
        >
          Register another family
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="space-y-6">
        <Section title="Parent details" description="We will use these to contact you.">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Parent's name" error={errors.parent_name}>
              <input
                className={inputClass(!!errors.parent_name)}
                aria-invalid={!!errors.parent_name}
                autoComplete="name"
                placeholder="Full name"
                value={values.parent_name}
                onChange={setValue("parent_name")}
              />
            </Field>

            <Field label="Contact / WhatsApp number" error={errors.contact_number}>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className={inputClass(!!errors.contact_number)}
                aria-invalid={!!errors.contact_number}
                placeholder="03XX XXXXXXX"
                value={values.contact_number}
                onChange={setValue("contact_number")}
              />
            </Field>

            <Field label="Home address" error={errors.home_address} className="md:col-span-2">
              <input
                className={inputClass(!!errors.home_address)}
                aria-invalid={!!errors.home_address}
                autoComplete="street-address"
                placeholder="House number, street, block"
                value={values.home_address}
                onChange={setValue("home_address")}
              />
            </Field>

            <SelectField
              label="Area"
              placeholder="Choose your area"
              options={AREAS}
              value={values.area}
              error={errors.area}
              onChange={setValue("area")}
            />

            <SelectField
              label="Town"
              placeholder="Choose your town"
              options={TOWNS}
              value={values.town}
              error={errors.town}
              onChange={setValue("town")}
            />
          </div>
        </Section>

        <Section title="Students" description="Add every child who is part of the exchange.">
          <div className="space-y-4">
            {students.map((s, i) => (
              <div key={s.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold">Student {i + 1}</h3>
                  {students.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setStudents((list) => list.filter((x) => x.id !== s.id))}
                      className="rounded-lg px-2 py-1 text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:ring-4 focus-visible:ring-red-100 focus-visible:outline-none"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Student's name" error={errors[`students.${i}.student_name`]}>
                    <input
                      className={inputClass(!!errors[`students.${i}.student_name`])}
                      aria-invalid={!!errors[`students.${i}.student_name`]}
                      value={s.student_name}
                      onChange={(e) => updateStudent(s.id, "student_name", e.target.value)}
                    />
                  </Field>

                  <SelectField
                    label="Current class"
                    placeholder="Choose class"
                    options={CLASS_LEVELS}
                    value={s.current_class}
                    error={errors[`students.${i}.current_class`]}
                    onChange={(e) => updateStudent(s.id, "current_class", e.target.value)}
                  />

                  <Field
                    label="School / Institute name"
                    error={errors[`students.${i}.school_name`]}
                    className="md:col-span-2"
                  >
                    <input
                      className={inputClass(!!errors[`students.${i}.school_name`])}
                      aria-invalid={!!errors[`students.${i}.school_name`]}
                      value={s.school_name}
                      onChange={(e) => updateStudent(s.id, "school_name", e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            ))}

            {errors.students && (
              <p role="alert" className="text-sm text-red-600">
                {errors.students}
              </p>
            )}

            {students.length < 10 && (
              <button
                type="button"
                onClick={() => setStudents((list) => [...list, newStudent()])}
                className="w-full rounded-xl border-2 border-dashed border-slate-300 px-4 py-3 font-semibold text-accent transition hover:border-accent hover:bg-accent/5 focus-visible:ring-4 focus-visible:ring-accent/25 focus-visible:outline-none"
              >
                + Add another student
              </button>
            )}
          </div>
        </Section>

        <Section title="Books">
          <fieldset>
            <legend className="sr-only">Books exchange or books given</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {BOOK_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-4 transition hover:border-slate-400 has-checked:border-accent has-checked:bg-accent/5 has-checked:ring-2 has-checked:ring-accent/20 has-focus-visible:ring-4 has-focus-visible:ring-accent/25"
                >
                  <input
                    type="radio"
                    name="book_exchange"
                    value={o.value}
                    className="size-5 accent-accent"
                    aria-invalid={!!errors.book_exchange}
                    checked={values.book_exchange === o.value}
                    onChange={setValue("book_exchange")}
                  />
                  <span className="font-medium">{o.label}</span>
                </label>
              ))}
            </div>
            {errors.book_exchange && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {errors.book_exchange}
              </p>
            )}
          </fieldset>
        </Section>
      </div>

      {/* Honeypot: hidden from people, bots fill it */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <input
          tabIndex={-1}
          autoComplete="off"
          name="company_url"
          value={values.company_url}
          onChange={setValue("company_url")}
        />
      </div>

      <div className="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">Only the organisers can see your details.</p>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-accent px-8 py-3.5 text-base font-semibold text-white transition hover:bg-accent/90 focus-visible:ring-4 focus-visible:ring-accent/30 focus-visible:outline-none disabled:opacity-60"
        >
          {isPending ? "Sending..." : "Send registration"}
        </button>
      </div>

      {serverError && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {serverError}
        </p>
      )}
    </form>
  )
}
