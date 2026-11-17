import { z } from "zod"
import { AREAS, BOOK_OPTIONS } from "./constants"

const areaValues = AREAS.map((a) => a.value) as [string, ...string[]]
const bookValues = BOOK_OPTIONS.map((b) => b.value) as [string, ...string[]]

export const studentSchema = z.object({
  student_name: z.string().trim().min(2, "Enter the student's name").max(100),
  current_class: z.string().trim().min(1, "Enter the current class").max(50),
  school_name: z.string().trim().min(2, "Enter the school name").max(150),
})

export const formSchema = z.object({
  parent_name: z.string().trim().min(2, "Enter the parent's name").max(100),
  contact_number: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{10,16}$/, "Enter a valid phone number"),
  home_address: z.string().trim().min(5, "Enter the home address").max(300),
  area: z.enum(areaValues, { message: "Choose an area" }),
  book_exchange: z.enum(bookValues, { message: "Choose an option" }),
  students: z
    .array(studentSchema)
    .min(1, "Add at least one student")
    .max(10, "Maximum 10 students"),
  company_url: z.string().optional(), // honeypot
})
