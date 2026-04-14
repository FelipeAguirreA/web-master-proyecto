import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Building2,
  Upload,
  Brain,
  GraduationCap,
} from "lucide-react";
import { getAuthSession, ADMIN_EMAIL } from "@/lib/auth";

export default async function Home() {
  const session = await getAuthSession();
  return (
    <div className="flex flex-col min-h-screen">
      {/* NAVBAR */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-tight">
            <span className="text-brand-700">Practi</span>
            <span className="text-accent-500">X</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/practicas"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Explorar
            </Link>
            {session ? (
              <>
                {session.user.email === ADMIN_EMAIL && (
                  <Link
                    href="/admin/empresas"
                    className="text-xs font-semibold bg-red-100 text-red-700 px-3 py-1.5 rounded-full hover:bg-red-200 transition-colors"
                  >
                    Admin
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
                >
                  Mi Dashboard
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
              >
                Iniciar sesión
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="pt-32 pb-20 text-center px-6">
          <div className="max-w-4xl mx-auto">
            <span className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              Matching inteligente con IA
            </span>

            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6">
              Encuentra la práctica{" "}
              <span className="text-brand-600">perfecta</span> para ti
            </h1>

            <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10">
              PractiX analiza tu CV con inteligencia artificial y te conecta con
              las prácticas que mejor se adaptan a tu perfil. Sin filtrar
              manualmente, sin perder tiempo.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login?role=student"
                className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white px-7 py-3.5 rounded-xl font-semibold shadow-lg shadow-brand-600/25 hover:bg-brand-700 transition-colors"
              >
                Soy Estudiante
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login?role=company"
                className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-7 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                <Building2 className="w-4 h-4" />
                Soy Empresa
              </Link>
            </div>
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section className="py-20 bg-white px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-14">
              ¿Cómo funciona?
            </h2>
            <div className="grid md:grid-cols-3 gap-10">
              {[
                {
                  icon: Upload,
                  title: "Sube tu CV",
                  desc: "Cargá tu currículum en PDF o Word. Nuestra IA extrae tus habilidades y experiencia automáticamente.",
                },
                {
                  icon: Brain,
                  title: "IA analiza tu perfil",
                  desc: "Generamos un vector semántico de tu perfil y lo comparamos con cada práctica disponible.",
                },
                {
                  icon: Sparkles,
                  title: "Recibí recomendaciones",
                  desc: "Ves las prácticas ordenadas por afinidad con tu perfil. Las más relevantes primero, siempre.",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex flex-col items-center text-center gap-4"
                >
                  <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-brand-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PARA QUIÉN */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <GraduationCap className="w-10 h-10 text-brand-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Para Estudiantes
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  "Matching basado en tu CV real",
                  "Score de afinidad con cada práctica",
                  "Postulación en un click",
                  "Seguimiento de tus postulaciones",
                  "100% gratuito",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-brand-600 font-bold mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <Building2 className="w-10 h-10 text-accent-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Para Empresas
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  "Publica prácticas en minutos",
                  "Candidatos rankeados por afinidad",
                  "Dashboard de gestión completo",
                  "Filtros por habilidades y carrera",
                  "Plan gratuito disponible",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-accent-500 font-bold mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-20 bg-brand-700 text-white text-center px-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">
              Comienza ahora — es gratis
            </h2>
            <p className="text-brand-200 mb-8 text-lg">
              Creá tu cuenta en segundos con Google y empezá a descubrir
              prácticas que se adaptan a tu perfil.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-white text-brand-700 px-7 py-3.5 rounded-xl font-semibold hover:bg-brand-50 transition-colors"
            >
              Crear cuenta
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="py-8 bg-gray-900 text-gray-400 text-sm text-center">
        © {new Date().getFullYear()} PractiX. Hecho con 💙 para estudiantes.
      </footer>
    </div>
  );
}
