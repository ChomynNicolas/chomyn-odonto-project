// src/components/uploads/UploadButton.tsx
"use client";

import { useState } from "react";

export default function UploadButton(props: {
  pacienteId?: number;
  procedimientoId?: number;
  tipo: "FOTO" | "RX" | "LAB" | "OTRO";
  onUploaded?: (payload: { publicId: string; secureUrl: string; bytes: number }) => void;
}) {
  const [loading, setLoading] = useState(false);

  const openWidget = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(props),
      });
      const sign = await res.json();
      if (!sign.ok) throw new Error("No se pudo firmar");

      // @ts-ignore - widget global (agrega en _app head el script de Cloudinary)
      const widget = window.cloudinary.createUploadWidget(
        {
          cloudName: sign.cloudName,
          apiKey: sign.apiKey,
          uploadSignatureTimestamp: sign.timestamp,
          uploadSignature: sign.signature,
          folder: sign.folder,
          sources: ["local", "camera"],
          multiple: false,
          showPoweredBy: false,
          // authenticated / public
          access_mode: sign.accessMode.toLowerCase(),
        },
        (error: any, result: any) => {
          if (!error && result && result.event === "success") {
            props.onUploaded?.({
              publicId: result.info.public_id,
              secureUrl: result.info.secure_url,
              bytes: result.info.bytes,
            });
          }
        }
      );
      widget.open();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={openWidget} disabled={loading} className="btn btn-primary">
      {loading ? "Preparando..." : "Subir adjunto"}
    </button>
  );
}
