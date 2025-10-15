import type { Metadata } from "next";
import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Iniciar sesión | Chomyn Odontología",
  description: "Acceso seguro al sistema clínico Chomyn Odontología",
};

export default function SignInPage() {
  return <SignInForm />;
}
