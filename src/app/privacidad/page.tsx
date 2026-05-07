import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad — PractiX",
  description:
    "Cómo PractiX recopila, usa, almacena y comparte tus datos personales en cumplimiento con la Ley 21.719 de Chile.",
};

const ULTIMA_ACTUALIZACION = "7 de mayo de 2026";

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-[#FAF8F4] text-[#0A0909]">
      <article className="mx-auto max-w-3xl px-6 py-16 prose prose-stone">
        <h1 className="text-4xl font-semibold tracking-tight">
          Política de Privacidad
        </h1>
        <p className="text-sm text-[#6D6A63]">
          Última actualización: {ULTIMA_ACTUALIZACION}
        </p>

        <aside className="my-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Documento en revisión legal.</strong> Esta política es un
          borrador técnico que describe el funcionamiento real de PractiX. La
          versión final será revisada por asesoría legal antes de la entrada en
          vigencia de la Ley 21.719 (1 de diciembre de 2026).
        </aside>

        <h2>1. Quiénes somos</h2>
        <p>
          <strong>PractiX</strong> es una plataforma chilena que conecta
          estudiantes con prácticas laborales mediante recomendaciones basadas
          en inteligencia artificial. Para consultas sobre privacidad escribí a{" "}
          <a href="mailto:soporte@practix.cl">soporte@practix.cl</a>.
        </p>

        <h2>2. Qué datos personales tratamos</h2>
        <p>
          Recopilamos únicamente los datos necesarios para el funcionamiento del
          servicio:
        </p>
        <ul>
          <li>
            <strong>De estudiantes</strong>: nombre, apellido, RUT, email,
            teléfono, foto (opcional), universidad, carrera, semestre,
            habilidades técnicas, biografía, archivo de CV (PDF/DOCX), y un
            vector semántico generado a partir del CV para realizar matching.
          </li>
          <li>
            <strong>De empresas</strong>: nombre legal, RUT empresa, email
            corporativo, teléfono de contacto, industria, sitio web, logo y
            descripción de la empresa.
          </li>
          <li>
            <strong>De toda persona registrada</strong>: contraseña hasheada con
            bcrypt (nunca en texto plano), tokens de sesión y refresh, fecha de
            registro y fecha de última modificación.
          </li>
          <li>
            <strong>De interacciones</strong>: postulaciones, mensajes en chat
            interno, entrevistas agendadas, notificaciones, historial de scoring
            del sistema ATS.
          </li>
        </ul>

        <h2>3. Para qué los tratamos (finalidades)</h2>
        <ul>
          <li>Operar la plataforma (cuentas, autenticación, perfiles).</li>
          <li>
            Matchear estudiantes con prácticas mediante similitud semántica
            entre el CV y la descripción del aviso.
          </li>
          <li>
            Permitir comunicación directa entre empresas y candidatos (chat,
            entrevistas).
          </li>
          <li>
            Notificar cambios de estado en postulaciones y eventos relevantes.
          </li>
          <li>
            Garantizar la seguridad del servicio (rate limiting, detección de
            abuso, registros de acceso).
          </li>
          <li>
            Cumplir obligaciones legales (responder requerimientos de
            autoridades, retención de logs por seguridad).
          </li>
        </ul>

        <h2>4. Base legal del tratamiento</h2>
        <p>
          El tratamiento se basa en el <strong>consentimiento</strong> que
          otorgás al registrarte y aceptar esta política, y en la{" "}
          <strong>ejecución del contrato</strong> de uso del servicio. Para
          datos de seguridad (logs de acceso, detección de fraude) la base es el{" "}
          <strong>interés legítimo</strong> de PractiX en mantener la plataforma
          operativa y segura.
        </p>

        <h2>5. Con quién compartimos tus datos</h2>
        <p>
          Compartimos datos con los siguientes proveedores que actúan como
          encargados de tratamiento:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> (Estados Unidos): almacenamiento de la
            base de datos PostgreSQL y de los archivos de CV en bucket privado.
          </li>
          <li>
            <strong>Vercel</strong> (Estados Unidos): hosting de la aplicación,
            entrega de contenido vía CDN, métricas de uso (Vercel Analytics) y
            métricas de performance (Speed Insights).
          </li>
          <li>
            <strong>HuggingFace</strong> (Estados Unidos): generación del vector
            semántico del CV mediante el modelo{" "}
            <code>BAAI/bge-small-en-v1.5</code>. Recibe el texto extraído del
            CV; no almacena el contenido fuera de la inferencia.
          </li>
          <li>
            <strong>Brevo / Sendinblue</strong> (Francia): envío de emails
            transaccionales (confirmaciones, recuperación de contraseña, avisos
            de postulación).
          </li>
          <li>
            <strong>Sentry</strong> (Estados Unidos): captura de errores y
            métricas de performance del backend. PractiX deshabilitó el envío de
            información personal identificable a Sentry; los payloads se
            sanitizan antes de salir del runtime.
          </li>
          <li>
            <strong>Google</strong> (Estados Unidos): cuando elegís autenticarte
            con tu cuenta de Google, Google recibe la solicitud de autenticación
            y nos devuelve tu email y nombre.
          </li>
        </ul>

        <h2>6. Transferencias internacionales</h2>
        <p>
          Algunos de nuestros proveedores procesan datos fuera de Chile,
          principalmente en Estados Unidos y Francia. PractiX trabaja para
          documentar acuerdos de transferencia de datos (DPA / Standard
          Contractual Clauses) con cada proveedor, alineados con los
          requerimientos de la Agencia de Protección de Datos Personales (APDP)
          de Chile.
        </p>

        <h2>7. Plazos de conservación</h2>
        <ul>
          <li>
            <strong>Cuenta activa</strong>: mientras mantengas la cuenta
            abierta.
          </li>
          <li>
            <strong>Cuenta eliminada</strong>: tus datos personales se borran de
            la base de datos productiva. Los archivos de CV en almacenamiento se
            eliminan junto con la cuenta. Pueden persistir registros mínimos
            (logs de auditoría, registros contables) por obligaciones legales o
            fines de seguridad.
          </li>
          <li>
            <strong>Postulaciones</strong>: las empresas a las que postulaste
            pueden retener tu candidatura por el plazo necesario para gestionar
            su proceso de selección.
          </li>
        </ul>

        <h2>8. Tus derechos</h2>
        <p>
          La Ley 21.719 te reconoce los siguientes derechos sobre tus datos
          personales (derechos ARCO+):
        </p>
        <ul>
          <li>
            <strong>Acceso</strong>: saber qué datos tenemos sobre vos.
          </li>
          <li>
            <strong>Rectificación</strong>: corregir datos incorrectos o
            desactualizados (podés hacerlo desde tu perfil).
          </li>
          <li>
            <strong>Cancelación / supresión</strong>: solicitar la eliminación
            de tus datos cuando ya no sean necesarios.
          </li>
          <li>
            <strong>Oposición</strong>: oponerte al tratamiento de tus datos por
            motivos personales legítimos.
          </li>
          <li>
            <strong>Portabilidad</strong>: recibir tus datos en formato
            estructurado y de uso común.
          </li>
        </ul>
        <p>
          Para ejercer cualquiera de estos derechos escribinos a{" "}
          <a href="mailto:soporte@practix.cl">soporte@practix.cl</a>{" "}
          identificándote y describiendo tu solicitud. Responderemos en los
          plazos que establezca la APDP. Si considerás que no respondimos
          adecuadamente, podés presentar reclamo ante la APDP.
        </p>

        <h2>9. Seguridad</h2>
        <p>
          Aplicamos medidas técnicas y organizativas para proteger tus datos:
        </p>
        <ul>
          <li>HTTPS obligatorio (HSTS) en todo el sitio.</li>
          <li>
            Contraseñas hasheadas con bcrypt (nunca almacenadas en texto plano).
          </li>
          <li>
            Tokens de sesión rotativos cada 15 minutos, con refresh token de 7
            días que se invalida si se detecta reuso.
          </li>
          <li>
            Headers de seguridad estrictos: Content Security Policy con nonces
            por request, X-Frame-Options, X-Content-Type-Options,
            Permissions-Policy.
          </li>
          <li>
            Rate limiting en endpoints sensibles para prevenir fuerza bruta.
          </li>
          <li>
            Auditoría continua del código y registros estructurados (sin
            información personal en logs).
          </li>
        </ul>

        <h2>10. Cookies y tecnologías similares</h2>
        <p>
          Usamos cookies estrictamente necesarias para el funcionamiento de la
          sesión (autenticación, refresh token, CSRF). No usamos cookies de
          publicidad ni de tracking de terceros. Las métricas anónimas de uso
          (Vercel Analytics) y de performance (Speed Insights) se procesan sin
          identificación personal.
        </p>

        <h2>11. Menores de edad</h2>
        <p>
          PractiX está orientada a estudiantes universitarios mayores de edad.
          Si tenés menos de 18 años, antes de registrarte debés contar con
          autorización de tu madre, padre o tutor legal. Si tomamos conocimiento
          de que registramos a un menor sin autorización, eliminaremos la
          cuenta.
        </p>

        <h2>12. Cambios a esta política</h2>
        <p>
          Podemos actualizar esta política cuando cambien nuestras prácticas o
          la regulación aplicable. Cuando los cambios sean sustanciales, te
          avisaremos por email o mediante un aviso destacado en el sitio antes
          de su entrada en vigencia.
        </p>

        <h2>13. Contacto y reclamos</h2>
        <ul>
          <li>
            Email: <a href="mailto:soporte@practix.cl">soporte@practix.cl</a>
          </li>
          <li>
            Autoridad de control: Agencia de Protección de Datos Personales
            (APDP) de Chile, una vez constituida bajo la Ley 21.719.
          </li>
        </ul>

        <p className="mt-12 text-sm text-[#6D6A63]">
          <Link href="/" className="underline hover:text-[#0A0909]">
            ← Volver al inicio
          </Link>
        </p>
      </article>
    </main>
  );
}
