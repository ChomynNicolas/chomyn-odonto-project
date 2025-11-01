import CitasCalendar from "@/components/agenda/CitasCalendar";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agenda | Chomyn Odontología",
  description: "Agenda de turnos",
};

export default function Page() {
  return (
    <div className="space-y-4">
      <PageBreadcrumb pageTitle="Agenda clínica" />
      <CitasCalendar />
    </div>
  );
}
