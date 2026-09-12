import { Header } from "@/components/Header";
import { DiagnosticMap } from "@/components/flow/DiagnosticMap";
import { DetailsDrawer } from "@/components/DetailsDrawer";
import { SettingsDrawer } from "@/components/SettingsDrawer";

export default function Home() {
  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <Header />
      <section className="relative flex-1">
        <DiagnosticMap />
      </section>
      <DetailsDrawer />
      <SettingsDrawer />
    </main>
  );
}
