import { auth, signIn, signOut } from '@/lib/auth';

export async function AuthButton() {
  const session = await auth();

  if (session?.user) {
    return (
      <form
        action={async () => {
          'use server';
          await signOut();
        }}
      >
        <p>Signed in as {session.user.email}</p>
        <button type="submit">Sign Out</button>
      </form>
    );
  }

  return (
    <form
      action={async () => {
        'use server';
        await signIn('google');
      }}
    >
      <button type="submit">Connect Google Calendar</button>
    </form>
  );
}
