import { auth } from '../(auth)/auth';
import { redirect } from 'next/navigation';
import { SubjectsPage } from '@/components/subjects-page';

export const instant = false;

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }

  return <SubjectsPage />;
}
