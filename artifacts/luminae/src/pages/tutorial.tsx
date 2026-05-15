import { consumePendingStartBeat } from "@/lib/tutorialStartBeat";
import { TutorialDirector } from "@/components/tutorial/TutorialDirector";

export default function Tutorial() {
  const startBeat = consumePendingStartBeat() ?? undefined;
  return <TutorialDirector startBeat={startBeat} />;
}
