import Link from 'next/link';
import { CURRENT_VERSION } from '@/lib/versions';

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-semibold">holiday</h1>
      <p className="text-fd-muted-foreground">
        1인용 복식부기 원장. 가계부·부채·자산·현금흐름.
      </p>
      <Link className="text-fd-primary underline underline-offset-4" href={`/docs/${CURRENT_VERSION.slug}`}>
        문서 읽기 →
      </Link>
    </main>
  );
}
