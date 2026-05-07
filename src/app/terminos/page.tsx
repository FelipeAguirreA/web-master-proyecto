import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y Condiciones — PractiX",
  description:
    "Términos de uso de la plataforma PractiX: derechos, obligaciones, contenido del usuario, responsabilidades y ley aplicable.",
};

const ULTIMA_ACTUALIZACION = "7 de mayo de 2026";

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-[#FAF8F4] text-[#0A0909]">
      <article className="mx-auto max-w-3xl px-6 py-16 prose prose-stone">
        <h1 className="text-4xl font-semibold tracking-tight">
          Términos y Condiciones de Uso
        </h1>
        <p className="text-sm text-[#6D6A63]">
          Última actualización: {ULTIMA_ACTUALIZACION}
        </p>

        <aside className="my-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Documento en revisión legal.</strong> Estos términos son un
          borrador técnico que describe las condiciones reales de uso de
          PractiX. La versión final será revisada por asesoría legal antes de la
          operación con usuarios reales en producción.
        </aside>

        <h2>1. Aceptación de los términos</h2>
        <p>
          Al registrarte o usar PractiX aceptás estos términos en su totalidad.
          Si no estás de acuerdo con alguna parte, no debés usar el servicio.
          Estos términos junto con la{" "}
          <Link href="/privacidad">Política de Privacidad</Link> constituyen el
          acuerdo completo entre vos y PractiX.
        </p>

        <h2>2. Descripción del servicio</h2>
        <p>
          PractiX es una plataforma que conecta estudiantes con prácticas
          laborales ofrecidas por empresas mediante un sistema de matching
          basado en inteligencia artificial. PractiX{" "}
          <strong>no es empleador ni intermediario laboral</strong>: las
          condiciones de la práctica son acordadas directamente entre el
          estudiante y la empresa.
        </p>

        <h2>3. Cuenta y registro</h2>
        <ul>
          <li>
            Para registrarte debés ser mayor de 18 años o contar con
            autorización del adulto responsable.
          </li>
          <li>
            Sos responsable de la veracidad de los datos que ingresás
            (especialmente RUT, email, datos académicos y CV).
          </li>
          <li>
            Sos responsable de mantener segura tu contraseña y de toda actividad
            realizada desde tu cuenta. Si detectás un acceso no autorizado,
            debés notificarnos de inmediato.
          </li>
          <li>
            Las empresas que se registren se comprometen a usar PractiX
            exclusivamente para fines de reclutamiento legítimo.
          </li>
        </ul>

        <h2>4. Conducta del usuario</h2>
        <p>Está prohibido usar PractiX para:</p>
        <ul>
          <li>
            Subir contenido falso, fraudulento, difamatorio, ilegal o que
            vulnere derechos de terceros.
          </li>
          <li>Suplantar la identidad de otra persona o entidad.</li>
          <li>
            Recolectar datos de otros usuarios (scraping, ofertas falsas para
            obtener CVs, etc.).
          </li>
          <li>
            Usar la plataforma para spam, phishing o cualquier comunicación no
            relacionada con prácticas laborales.
          </li>
          <li>
            Realizar ingeniería inversa, vulnerar la seguridad o intentar
            acceder a sistemas o datos no autorizados.
          </li>
          <li>
            Ofrecer &ldquo;prácticas&rdquo; que en realidad encubran trabajo no
            remunerado sin las condiciones legales aplicables.
          </li>
        </ul>

        <h2>5. Contenido del usuario</h2>
        <p>
          Vos sos el único responsable del contenido que subís a PractiX (CV,
          perfil, mensajes, descripciones de prácticas). Al subirlo nos
          autorizás a:
        </p>
        <ul>
          <li>
            Almacenarlo, procesarlo y mostrarlo a otros usuarios de la
            plataforma según corresponda al funcionamiento del servicio.
          </li>
          <li>
            Generar representaciones técnicas necesarias para el matching
            (vectores semánticos del CV).
          </li>
        </ul>
        <p>
          Conservás la titularidad de tu contenido. Podés eliminarlo en
          cualquier momento mediante la eliminación de cuenta o las opciones de
          tu perfil.
        </p>

        <h2>6. Propiedad intelectual</h2>
        <p>
          La marca PractiX, el diseño, el código, los algoritmos de matching y
          el resto de los elementos de la plataforma son propiedad de PractiX o
          de sus licenciantes. No podés copiarlos, modificarlos ni usarlos fuera
          del uso normal del servicio.
        </p>

        <h2>7. Disponibilidad y modificaciones del servicio</h2>
        <ul>
          <li>
            PractiX se ofrece &ldquo;tal como está&rdquo;. No garantizamos
            disponibilidad ininterrumpida ni que el servicio esté libre de
            errores.
          </li>
          <li>
            Podemos modificar, suspender o discontinuar funcionalidades en
            cualquier momento. Cuando los cambios afecten significativamente tus
            derechos o tus datos, te avisaremos con antelación razonable.
          </li>
          <li>Podemos aplicar mantenimiento programado o no programado.</li>
        </ul>

        <h2>8. Limitación de responsabilidad</h2>
        <p>Dentro de lo permitido por la legislación aplicable:</p>
        <ul>
          <li>
            PractiX no es responsable por las decisiones de contratación de las
            empresas ni por la conducta de los usuarios fuera de la plataforma.
          </li>
          <li>
            PractiX no garantiza que un estudiante consiga una práctica ni que
            una empresa encuentre candidatos.
          </li>
          <li>
            La calificación que el sistema ATS asigna a un postulante es
            referencial; la decisión final corresponde a la empresa.
          </li>
          <li>
            No respondemos por daños indirectos, lucro cesante o pérdida de
            oportunidades derivados del uso del servicio.
          </li>
        </ul>

        <h2>9. Suspensión y terminación</h2>
        <p>
          Podemos suspender o cerrar tu cuenta si incumplís estos términos, si
          detectamos uso fraudulento o si hay obligación legal de hacerlo. Vos
          podés cerrar tu cuenta en cualquier momento mediante la opción
          correspondiente en tu perfil o escribiendo a{" "}
          <a href="mailto:soporte@practix.cl">soporte@practix.cl</a>.
        </p>

        <h2>10. Ley aplicable y jurisdicción</h2>
        <p>
          Estos términos se rigen por la ley chilena. Cualquier controversia
          será resuelta por los tribunales ordinarios de justicia de la ciudad
          de Santiago de Chile, salvo que la legislación aplicable disponga lo
          contrario para protección del consumidor.
        </p>

        <h2>11. Contacto</h2>
        <p>
          Para dudas o reclamos:{" "}
          <a href="mailto:soporte@practix.cl">soporte@practix.cl</a>.
        </p>

        <p className="mt-12 text-sm text-[#6D6A63]">
          <Link href="/" className="underline hover:text-[#0A0909]">
            ← Volver al inicio
          </Link>
        </p>
      </article>
    </main>
  );
}
