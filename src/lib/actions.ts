"use server"

import { formSchema } from "./schema"
import { supabaseAdmin } from "./supabase/admin"

export type FormResult = {
  status: "success" | "error"
  message?: string
  errors?: Record<string, string>
}

export async function submitForm(input: unknown): Promise<FormResult> {
  const parsed = formSchema.safeParse(input)

  if (!parsed.success) {
    const errors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".")
      if (!errors[key]) errors[key] = issue.message
    }
    return { status: "error", errors }
  }

  const d = parsed.data

  // Honeypot: bots fill this hidden field. Pretend it worked.
  if (d.company_url) return { status: "success" }

  const { error } = await supabaseAdmin().rpc("submit_form", {
    p_parent_name: d.parent_name,
    p_contact_number: d.contact_number,
    p_home_address: d.home_address,
    p_area: d.area,
    p_book_exchange: d.book_exchange,
    p_students: d.students,
  })

  if (error) {
    console.error("submit_form failed:", error)
    return { status: "error", message: "Something went wrong. Please try again." }
  }

  return { status: "success" }
}
