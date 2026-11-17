import ParentForm from "@/components/ParentForm"

export default function Home() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[22rem_1fr] lg:gap-8 lg:py-12">
      <aside className="ruled rounded-3xl p-8 pl-20 text-white lg:sticky lg:top-12 lg:self-start lg:p-10 lg:pl-20">
        <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">
          Book exchange registration
        </h1>
        <p className="mt-4 text-slate-200">
          Fill in this form once for your family. It only takes a couple of minutes.
        </p>
        <ul className="mt-8 space-y-3 text-sm text-slate-200">
          <li>Add up to 10 students in one form.</li>
          <li>Only the organisers can see your details.</li>
        </ul>
      </aside>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <ParentForm />
      </section>
    </main>
  )
}
