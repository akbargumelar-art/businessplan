import { redirect } from 'next/navigation';
import { auth, signIn } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect('/dashboard');

  const params = await searchParams;
  const errorMsg = params.error
    ? params.error === 'CredentialsSignin'
      ? 'Email atau password salah.'
      : 'Login gagal. Coba lagi.'
    : null;

  async function login(formData: FormData) {
    'use server';
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/dashboard',
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-slate-900">Business Plan Manager</h1>
          <p className="text-sm text-slate-500 mt-1">Masuk untuk melanjutkan</p>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <form action={login} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <Button type="submit" className="w-full">Sign in</Button>
        </form>
      </div>
    </div>
  );
}
