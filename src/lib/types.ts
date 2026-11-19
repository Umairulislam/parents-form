export type Student = {
  id: string
  student_name: string
  current_class: string
  school_name: string
  card_number: number
}

export type Submission = {
  id: string
  parent_name: string
  contact_number: string
  home_address: string
  town: string | null // old test rows may have no town
  area: string
  book_exchange: "exchange" | "given"
  created_at: string
  created_label: string // e.g. "17 Nov 2026, 3:45 pm" (Karachi time)
  created_day: string // e.g. "2026-11-17" (Karachi time)
  students: Student[]
}

export type CardData = {
  card_id: string
  student_name: string
  current_class: string
  parent_name: string
  contact_number: string
  town: string
  area: string
}
