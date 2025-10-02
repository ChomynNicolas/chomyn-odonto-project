import type { Metadata } from "next";
import SignUpForm from "@/components/auth/SignUpForm";

export const metadata: Metadata = {
  title: "Crear cuenta | Chomyn Odontología",
  description: "Registro de usuario para el sistema de gestión clínica",
};

export default function SignUpPage() {
  return <SignUpForm />;
}
