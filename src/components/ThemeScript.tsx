import { STORAGE_KEY } from "@/features/storage/schema";

/** Runs before first paint so the saved theme never flashes the default. Reads storage defensively. */
const SCRIPT = `try{var s=(JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"{}")||{}).settings||{};var h=document.documentElement;if(s.theme)h.dataset.theme=s.theme;if(s.fontSize)h.dataset.size=s.fontSize;if(s.reduceMotion)h.dataset.motion="reduce"}catch(e){}`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
