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
    <div className="flex flex-col min-h-screen bg-[#faf8f5]">
      {/* NAVBAR */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-black text-2xl tracking-tighter">
            <span className="text-brand-700">Practi</span>
            <span className="text-accent-500">X</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/practicas"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              Explorar prácticas
            </Link>
            <Link
              href="#como-funciona"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Recursos
            </Link>
            <Link
              href="#precios"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Precios
            </Link>
          </nav>

          <div className="flex items-center gap-3">
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
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard"
                  className="text-sm bg-accent-500 text-white px-4 py-2 rounded-lg hover:bg-accent-600 transition-colors font-medium"
                >
                  Contacto
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/login"
                  className="text-sm bg-accent-500 text-white px-4 py-2 rounded-lg hover:bg-accent-600 transition-colors font-medium"
                >
                  Contacto
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="relative pt-24 pb-0 overflow-hidden">
          {/* Gradiente de fondo */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#faf8f5] via-[#fef3e8] to-[#fde8cc] pointer-events-none" />
          <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-bl from-orange-100/60 via-amber-50/40 to-transparent pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh] pb-16">
              {/* Columna izquierda: texto */}
              <div className="flex flex-col justify-center">
                <span className="inline-flex items-center gap-2 bg-orange-100 text-accent-600 rounded-full px-4 py-1.5 text-sm font-medium mb-6 w-fit">
                  <Sparkles className="w-4 h-4" />
                  Matching inteligente con IA
                </span>

                <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight mb-6">
                  Encuentra la práctica{" "}
                  <span className="text-accent-500">perfecta</span> para ti
                </h1>

                <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
                  Sube tu CV, nuestra IA lo analiza y te conecta con las
                  prácticas que mejor se adaptan a tu perfil. Sin filtrar
                  manualmente, sin perder tiempo.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/login?role=student"
                    className="inline-flex items-center justify-center gap-2 bg-accent-500 text-white px-7 py-3.5 rounded-xl font-semibold shadow-lg shadow-accent-500/25 hover:bg-accent-600 transition-colors"
                  >
                    <GraduationCap className="w-4 h-4" />
                    Soy Estudiante
                  </Link>
                  <Link
                    href="/login?role=company"
                    className="inline-flex items-center justify-center gap-2 bg-white/80 border border-gray-200 text-gray-700 px-7 py-3.5 rounded-xl font-semibold hover:bg-white transition-colors"
                  >
                    <Building2 className="w-4 h-4" />
                    Soy Empresa
                  </Link>
                </div>
              </div>

              {/* Columna derecha: ilustración */}
              <div className="hidden lg:flex items-center justify-center">
                <div className="relative w-full max-w-lg">
                  {/* Card principal ilustración */}
                  <div className="relative bg-white/60 backdrop-blur-sm rounded-3xl shadow-2xl shadow-orange-200/50 border border-white/80 p-8 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-50/80 to-amber-50/40 pointer-events-none" />
                    <div className="relative flex flex-col gap-4">
                      {/* Mock UI */}
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center">
                          <Brain className="w-4 h-4 text-accent-500" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-700">
                            Análisis IA completado
                          </p>
                          <p className="text-xs text-gray-400">
                            Score de afinidad calculado
                          </p>
                        </div>
                        <span className="ml-auto text-xs font-bold text-accent-500 bg-orange-50 px-2 py-1 rounded-full">
                          98%
                        </span>
                      </div>

                      {/* Match cards */}
                      {[
                        {
                          company: "TechCorp",
                          role: "Frontend Developer",
                          match: 98,
                          color: "text-green-600 bg-green-50",
                        },
                        {
                          company: "StartupXYZ",
                          role: "Full Stack Intern",
                          match: 94,
                          color: "text-blue-600 bg-blue-50",
                        },
                        {
                          company: "InnovaLab",
                          role: "React Developer",
                          match: 89,
                          color: "text-purple-600 bg-purple-50",
                        },
                      ].map((item) => (
                        <div
                          key={item.company}
                          className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                        >
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-500">
                            {item.company[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {item.role}
                            </p>
                            <p className="text-xs text-gray-400">
                              {item.company}
                            </p>
                          </div>
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full ${item.color}`}
                          >
                            {item.match}% match
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Badges flotantes */}
                  <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-lg border border-gray-100 p-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-600 text-sm">✓</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-700">
                        CV analizado
                      </p>
                      <p className="text-xs text-gray-400">en 3 segundos</p>
                    </div>
                  </div>

                  <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-lg border border-gray-100 p-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent-500" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">
                        +200 prácticas
                      </p>
                      <p className="text-xs text-gray-400">disponibles hoy</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section id="como-funciona" className="py-20 bg-white px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-accent-500 uppercase tracking-widest mb-3">
                Simple como 1, 2, 3
              </p>
              <h2 className="text-3xl font-bold text-gray-900">
                ¿Cómo funciona?
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Upload,
                  title: "Sube tu CV",
                  desc: "Cargá tu currículum en PDF o Word. Nuestra IA extrae tus habilidades y experiencia automáticamente.",
                  step: "01",
                },
                {
                  icon: Brain,
                  title: "Análisis IA",
                  desc: "Generamos un vector semántico de tu perfil y lo comparamos con cada práctica disponible.",
                  step: "02",
                },
                {
                  icon: Sparkles,
                  title: "Recomendaciones",
                  desc: "Ves las prácticas ordenadas por afinidad con tu perfil. Las más relevantes primero, siempre.",
                  step: "03",
                },
              ].map(({ icon: Icon, title, desc, step }) => (
                <div
                  key={title}
                  className="relative flex flex-col items-center text-center gap-4 p-8 rounded-2xl bg-[#faf8f5] border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <span className="absolute top-6 right-6 text-3xl font-black text-gray-100 select-none">
                    {step}
                  </span>
                  <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-accent-500" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PARA QUIÉN */}
        <section className="py-20 px-6 bg-gradient-to-b from-[#faf8f5] to-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">
                Construido para todos
              </h2>
              <p className="text-gray-500 mt-2">
                Conectamos estudiantes con las mejores oportunidades laborales
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-5">
                  <GraduationCap className="w-6 h-6 text-brand-600" />
                </div>
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
                    <li key={item} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-brand-600 text-xs font-bold">
                          ✓
                        </span>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login?role=student"
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                >
                  Registrarme como estudiante
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mb-5">
                  <Building2 className="w-6 h-6 text-accent-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Para Empresas
                </h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  {[
                    "Publicá prácticas en minutos",
                    "Candidatos rankeados por afinidad",
                    "Dashboard de gestión completo",
                    "Filtros por habilidades y carrera",
                    "Plan gratuito disponible",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-accent-500 text-xs font-bold">
                          ✓
                        </span>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login?role=company"
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-500 hover:text-accent-600 transition-colors"
                >
                  Registrar mi empresa
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-gray-900 rounded-3xl overflow-hidden p-12 text-center">
              {/* Gradiente decorativo */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-accent-500/20 blur-3xl rounded-full pointer-events-none" />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Comienza ahora
                </h2>
                <p className="text-gray-400 mb-8 text-lg max-w-lg mx-auto">
                  Creá tu cuenta en segundos con Google y empezá a descubrir
                  prácticas que se adaptan a tu perfil.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 bg-accent-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-accent-600 transition-colors shadow-lg shadow-accent-500/30"
                >
                  Empezar gratis
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="py-8 px-6 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="font-bold text-lg tracking-tight">
            <span className="text-brand-700">Practi</span>
            <span className="text-accent-500">X</span>
          </Link>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link
              href="/practicas"
              className="hover:text-gray-600 transition-colors"
            >
              Explorar
            </Link>
            <Link
              href="#como-funciona"
              className="hover:text-gray-600 transition-colors"
            >
              Cómo funciona
            </Link>
            <Link
              href="/login"
              className="hover:text-gray-600 transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} PractiX
          </p>
        </div>
      </footer>
    </div>
  );
}
