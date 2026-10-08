import { LessonList } from "@/features/lessons/LessonList";

export default function HomePage() {
  return (
    <div className="page-narrow">
      <h1 className="page-title">learn to type with ten fingers</h1>
      <p className="page-lede">
        Every lesson is open. Pick one, start typing, and the keyboard shows you which finger goes
        where. Passing means 95% accuracy.
      </p>
      <LessonList />
    </div>
  );
}
