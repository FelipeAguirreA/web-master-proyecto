"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Lock,
} from "lucide-react";
import Link from "next/link";

type ProfileData = {
  id: string;
  name: string;
  lastName: string;
  email: string;
  phone: string | null;
  rut: string | null;
  role: string;
  image: string | null;
  companyProfile?: { companyName: string; companyStatus: string } | null;
};

const INPUT_CLS =
  "w-full rounded-xl px-4 py-2.5 text-[14px] bg-[#FAFAF8] border border-transparent hover:border-black/[0.05] focus:outline-none focus:border-[#FF6A3D]/40 focus:bg-white focus:shadow-[0_0_0_4px_rgba(255,106,61,0.08)] transition-all placeholder:text-[#9B9891] text-[#0A0909]";
const INPUT_READONLY =
  "w-full rounded-xl px-4 py-2.5 text-[14px] bg-[#F4F3EF] text-[#9B9891] border border-transparent cursor-not-allowed select-all";
const LABEL_CLS =
  "block text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6D6A63] mb-2";

export default function PerfilPage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageBroken, setImageBroken] = useState(false);

  useEffect(() => {
    fetch("/api/perfil")
      .then((r) => r.json())
      .then((data: ProfileData) => {
        setProfile(data);
        setName(data.name ?? "");
        setLastName(data.lastName ?? "");
        setPhone(data.phone ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Solo se permiten imágenes JPG, PNG o WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("El archivo no puede superar los 2 MB.");
      return;
    }

    setError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      let newImageUrl: string | null = null;
      if (avatarFile) {
        setSavingAvatar(true);
        const form = new FormData();
        form.append("avatar", avatarFile);
        const avatarRes = await fetch("/api/perfil/avatar", {
          method: "POST",
          body: form,
        });
        setSavingAvatar(false);
        if (!avatarRes.ok) {
          const err = await avatarRes.json();
          throw new Error(err.error ?? "Error al subir la imagen.");
        }
        const { url } = await avatarRes.json();
        newImageUrl = url;
      }

      const dataRes = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
        }),
      });

      if (!dataRes.ok) {
        const err = await dataRes.json();
        throw new Error(err.error ?? "Error al guardar el perfil.");
      }

      const updated = await dataRes.json();

      await update({
        name: updated.name,
        ...(newImageUrl ? { image: newImageUrl } : {}),
      });

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              name: updated.name,
              lastName: updated.lastName,
              phone: updated.phone,
              ...(newImageUrl ? { image: newImageUrl } : {}),
            }
          : prev,
      );
      if (newImageUrl) setImageBroken(false);
      setAvatarFile(null);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error inesperado.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#FF6A3D]/25 border-t-[#FF6A3D] rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const isCompany = profile.role === "COMPANY";
  const sessionImage = (session?.user as { image?: string } | undefined)?.image;
  const rawImage = avatarPreview ?? profile.image ?? sessionImage ?? null;
  const currentImage =
    avatarPreview ?? (imageBroken ? (sessionImage ?? null) : rawImage);
  const displayInitial = (profile.name || session?.user?.name || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 sm:py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#FF6A3D]">
            Tu cuenta
          </p>
          <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-bold tracking-[-0.02em] text-[#0A0909] mt-1">
            Editar perfil
          </h1>
          <p className="text-[13.5px] text-[#6D6A63] mt-1">
            Mantené tu información al día para mejorar tu match y tu presencia.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="hidden sm:inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#6D6A63] hover:text-[#FF6A3D] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver
        </Link>
      </div>

      <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-black/[0.06] shadow-[0_8px_32px_-12px_rgba(20,15,10,0.08)] overflow-hidden">
        {/* Avatar header */}
        <div className="relative px-5 sm:px-8 py-6 sm:py-9 border-b border-black/[0.05] overflow-hidden">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute -top-20 -left-20 w-[360px] h-[360px] rounded-full bg-[radial-gradient(closest-side,rgba(255,181,124,0.35),transparent_70%)] blur-[50px]" />
            <div className="absolute -bottom-24 -right-16 w-[320px] h-[320px] rounded-full bg-[radial-gradient(closest-side,rgba(255,138,82,0.22),transparent_70%)] blur-[50px]" />
          </div>

          <div className="relative flex flex-col items-center gap-3">
            <div className="relative">
              {currentImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={currentImage}
                  src={currentImage}
                  alt={profile.name}
                  onError={() => setImageBroken(true)}
                  className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-[0_12px_32px_-8px_rgba(20,15,10,0.18)] bg-[#F5F4F1]"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] text-white flex items-center justify-center text-[36px] font-bold border-4 border-white shadow-[0_12px_32px_-8px_rgba(255,106,61,0.45)]">
                  {displayInitial}
                </div>
              )}

              {avatarFile && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 bg-[#0A0909] text-white text-[9.5px] font-bold px-2 py-0.5 rounded-full shadow tracking-[0.06em] uppercase">
                  Preview
                </span>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-9 h-9 bg-white border border-black/[0.06] rounded-full flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(20,15,10,0.15)] hover:bg-[#FFF3EC] hover:border-[#FF6A3D]/30 transition-all"
                aria-label="Cambiar foto"
              >
                <Camera className="w-4 h-4 text-[#FF6A3D]" strokeWidth={2.2} />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />

            <div className="text-center mt-1">
              <p className="text-[15px] font-semibold tracking-[-0.01em] text-[#0A0909]">
                {profile.name} {profile.lastName}
              </p>
              <p className="text-[12px] text-[#6D6A63] mt-0.5">
                {isCompany
                  ? (profile.companyProfile?.companyName ?? "Empresa")
                  : "Estudiante · PractiX"}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#FF6A3D] hover:text-[#FF5A28] transition-colors"
              >
                <Camera className="w-3.5 h-3.5" strokeWidth={2.2} />
                {isCompany ? "Cambiar logo" : "Cambiar foto"}
              </button>
              {avatarFile && (
                <>
                  <span className="w-px h-3 bg-black/[0.08]" />
                  <button
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-[11.5px] font-semibold text-[#6D6A63] hover:text-[#C2410C] transition-colors"
                  >
                    Descartar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="px-5 sm:px-8 py-6 sm:py-7 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={INPUT_CLS}
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Apellido</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={INPUT_CLS}
                placeholder="Tu apellido"
              />
            </div>
          </div>

          <div>
            <label className={LABEL_CLS}>Teléfono</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+56 9 1234 5678"
              className={INPUT_CLS}
            />
          </div>

          <div className="pt-2">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase text-[#9B9891] mb-3">
              <Lock className="w-3 h-3" strokeWidth={2.4} />
              Datos no editables
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Email</label>
                <div className={INPUT_READONLY}>{profile.email}</div>
              </div>
              {profile.rut && (
                <div>
                  <label className={LABEL_CLS}>RUT</label>
                  <div className={INPUT_READONLY}>{profile.rut}</div>
                </div>
              )}
              {isCompany && profile.companyProfile?.companyName && (
                <div>
                  <label className={LABEL_CLS}>Empresa</label>
                  <div className={INPUT_READONLY}>
                    {profile.companyProfile.companyName}
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-[#FFF0ED] border border-[#FF6A3D]/20 px-4 py-3 text-[13px] text-[#A63418] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#FF6A3D]" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-[#E7F8EA] border border-[#1A8F3C]/20 px-4 py-3 text-[13px] text-[#1A6E31] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1A8F3C]" />
              Perfil actualizado. Te llevamos al dashboard…
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/dashboard"
              className="text-[13px] font-semibold text-[#6D6A63] hover:text-[#0A0909] transition-colors px-4 py-2.5"
            >
              Cancelar
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] text-white font-semibold px-6 py-2.5 rounded-xl text-[13.5px] shadow-[0_8px_20px_-6px_rgba(255,106,61,0.5)] hover:shadow-[0_12px_28px_-8px_rgba(255,106,61,0.6)] hover:from-[#FF5A28] hover:to-[#FF8A52] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {savingAvatar ? "Subiendo imagen…" : "Guardando…"}
                </>
              ) : (
                <>
                  Guardar cambios
                  <span className="transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
