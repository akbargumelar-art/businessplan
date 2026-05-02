import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/permissions';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SignaturePad } from '@/components/signature-pad';

export default async function ProfilePage() {
  const session = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.id },
    include: { supervisor: { select: { name: true } } },
  });

  return (
    <div className="w-full space-y-6">
      <PageHeader title="Profil Saya" description="Info akun & tanda tangan digital." />

      <Card>
        <CardHeader><CardTitle>Info Akun</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <dt className="text-slate-500">Nama</dt><dd className="col-span-2 font-medium">{user.name}</dd>
            <dt className="text-slate-500">Email</dt><dd className="col-span-2">{user.email}</dd>
            <dt className="text-slate-500">Role</dt><dd className="col-span-2"><Badge variant={user.role === 'admin' ? 'purple' : user.role === 'supervisor' ? 'blue' : 'gray'}>{user.role}</Badge></dd>
            <dt className="text-slate-500">Departemen</dt><dd className="col-span-2">{user.department ?? '-'}</dd>
            <dt className="text-slate-500">Atasan</dt><dd className="col-span-2">{user.supervisor?.name ?? '-'}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tanda Tangan Digital</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Dipakai otomatis di PDF proposal yang Anda buat (di atas nama "Dibuat Oleh").
            Gambar langsung di canvas atau upload PNG/JPG (idealnya background transparan).
          </p>
        </CardHeader>
        <CardContent>
          <SignaturePad existing={user.signatureImagePath} />
        </CardContent>
      </Card>
    </div>
  );
}
