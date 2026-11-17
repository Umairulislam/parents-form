import ParentForm from "@/components/ParentForm"

export default function Home() {
  return (
    <main className="min-h-screen pb-16">
      <header className="bg-ink text-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
            Book exchange registration form
          </h1>
          <div className="mt-4 h-1 w-16 rounded-full bg-pencil" />
          <p className="mt-4 max-w-2xl text-base text-slate-200 sm:text-lg">
            Please fill in your details and add every student who is taking part. All fields are
            required.
          </p>
        </div>
      </header>

      <div className="mx-auto -mt-6 max-w-5xl px-4 sm:-mt-8 sm:px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <ParentForm />
        </div>
      </div>
    </main>
  )
}
