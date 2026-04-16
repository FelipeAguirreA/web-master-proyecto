"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

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

export default function PerfilPage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Campos editables
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de guardado
  const [saving, setSaving] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos iniciales
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
      // 1. Subir avatar si hay uno nuevo
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

      // 2. Guardar datos del perfil
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

      // 3. Actualizar sesión para que el navbar refleje los cambios
      await update({
        name: updated.name,
        ...(newImageUrl ? { image: newImageUrl } : {}),
      });

      // Actualizar estado local
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
      setAvatarFile(null);
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1000);
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
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const isCompany = profile.role === "COMPANY";
  const currentImage = avatarPreview ?? profile.image;
  const displayInitial = (profile.name || session?.user?.name || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-black text-gray-900 mb-8">Editar perfil</h1>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 bg-gradient-to-b from-brand-50 to-white px-8 py-8 border-b border-gray-100">
          {/* Contenedor avatar */}
          <div className="relative">
            {/* Imagen actual o inicial */}
            {currentImage ? (
              <img
                key={currentImage}
                src={currentImage}
                alt={profile.name}
                className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-md"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-4xl font-black border-4 border-white shadow-md">
                {displayInitial}
              </div>
            )}

            {/* Badge "Vista previa" cuando hay archivo nuevo */}
            {avatarFile && (
              <span className="absolute -top-1 -right-1 bg-brand-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                PREVIEW
              </span>
            )}

            {/* Botón cambiar foto (siempre visible abajo) */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-white border-2 border-brand-200 rounded-full flex items-center justify-center shadow hover:bg-brand-50 transition-colors"
            >
              <Camera className="w-4 h-4 text-brand-600" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />

          <div className="text-center">
            <p className="text-sm font-bold text-gray-900">
              {profile.name} {profile.lastName}
            </p>
            <p className="text-xs text-gray-400">
              {isCompany
                ? (profile.companyProfile?.companyName ?? "Empresa")
                : "Estudiante"}
            </p>
          </div>

          {/* Acciones de foto */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-brand-600 font-semibold hover:underline"
            >
              {isCompany ? "Cambiar logo" : "Cambiar foto"}
            </button>
            {avatarFile && (
              <>
                <span className="text-gray-300">·</span>
                <button
                  onClick={() => {
                    setAvatarFile(null);
                    setAvatarPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-xs text-red-500 font-semibold hover:underline"
                >
                  Descartar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Formulario */}
        <div className="px-8 py-6 space-y-5">
          {/* Nombre */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Nombre
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Apellido
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Teléfono
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+56 9 1234 5678"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Campos de solo lectura */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <div className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-400 bg-gray-50 cursor-not-allowed">
                {profile.email}
              </div>
            </div>
            {profile.rut && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  RUT
                </label>
                <div className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-400 bg-gray-50 cursor-not-allowed">
                  {profile.rut}
                </div>
              </div>
            )}
            {isCompany && profile.companyProfile?.companyName && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Empresa
                </label>
                <div className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-400 bg-gray-50 cursor-not-allowed">
                  {profile.companyProfile.companyName}
                </div>
              </div>
            )}
          </div>

          {/* Feedback */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Perfil actualizado correctamente.
            </div>
          )}

          {/* Botón guardar */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {savingAvatar
                ? "Subiendo imagen..."
                : saving
                  ? "Guardando..."
                  : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
