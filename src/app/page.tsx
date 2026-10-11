import { PageHeader } from "@/components/ui/PageHeader";
import { LessonList } from "@/features/lessons/LessonList";

export default function HomePage() {
  return (
    <div className="page-narrow">
      <PageHeader
        title="learn to type with ten fingers"
        lede="Every lesson is open. Pick one, start typing, and the keyboard shows you which finger goes where. Passing means 95% accuracy."
      />
      <LessonList />
    </div>
  );
}
