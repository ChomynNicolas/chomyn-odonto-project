import type { Metadata } from "next";
import React from "react";
import { ClinicMetrics } from "@/components/ecommerce/ClinicMetrics";
import MonthlyGoalCard from "@/components/ecommerce/MonthlyGoalCard";
import UpcomingAppointments from "@/components/ecommerce/UpcomingAppointments";

export const metadata: Metadata = {
  title: "Chomyn Odontología – Panel",
  description: "Panel principal del sistema clínico",
};

export default function DashboardHome() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-7">
        {/* KPIs clínicos */}
        <ClinicMetrics />


      </div>

      <div className="col-span-12 xl:col-span-5">

        <MonthlyGoalCard
          title="Ocupación mensual"
          subtitle="Promedio de ocupación del mes"
          mode="ocupacion"
          target={80}
          achieved={75}
          today={78}
          deltaPct={-2}
        />
      </div>



      <div className="col-span-12">
        <UpcomingAppointments />
      </div>




    </div>
  );
}
