import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LESSON_BY_ID, LESSONS } from "@/features/lessons/curriculum";
import { LessonRunner } from "@/features/typing/LessonRunner";

export const dynamicParams = false;

export function generateStaticParams() {
  return LESSONS.map((l) => ({ id: l.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const lesson = LESSON_BY_ID.get(id);
  return {
    title: lesson ? `lesson: ${lesson.title}` : "lesson",
    alternates: { canonical: `/lesson/${id}/` },
  };
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!LESSON_BY_ID.has(id)) notFound();
  return <LessonRunner lessonId={id} />;
}
