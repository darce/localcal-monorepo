import { AuthButton } from '@/components/AuthButton';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await auth();
  if (session?.accessToken) {
    redirect('/calendar');
  }

  return (
    <main>
      <h1>LocalCal</h1>
      <p>Connect your Google Calendar to view your events.</p>
      <AuthButton />
    </main>
  );
}
