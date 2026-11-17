import LoginForm from "@/components/LoginForm"

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="font-display text-2xl font-bold">Admin sign in</h1>
        <p className="mt-1 text-sm text-slate-600">Sign in to view the registrations.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
