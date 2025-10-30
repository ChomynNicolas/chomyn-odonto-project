import CitasCalendar from "@/components/agenda/CitasCalendar";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Agenda | Chomyn Odontología",
  description: "Agenda de turnos",
};

export default function page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Calendar" />
      <CitasCalendar />
    </div>
  );
}
