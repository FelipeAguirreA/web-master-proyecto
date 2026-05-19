// Contenido literal de los documentos legales — referencias a la Ley N° 19.628
// y la Ley N° 21.719 (Chile). Datos de contacto y razón social marcados como
// placeholders en el mock — REEMPLAZAR antes de prod por los datos reales de
// PractiX SpA.

type LegalListBlock = {
  title?: string;
  items: string[];
};

type LegalSection = {
  id: string;
  t: string;
  paragraphs?: string[];
  lists?: LegalListBlock[];
  paragraphs2?: string[];
};

type LegalDoc = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

export type LegalDocKey = "privacidad" | "terminos";

const UPDATED = "14 de mayo de 2026";

const PRIVACIDAD: LegalDoc = {
  title: "Política de Privacidad",
  updated: UPDATED,
  intro:
    'Esta Política describe cómo PractiX SpA ("PractiX", "nosotros") recopila, usa, comparte y protege tus datos personales cuando usas nuestra plataforma. Cumplimos con la Ley N° 19.628 sobre Protección de la Vida Privada y la Ley N° 21.719 de 2024 que moderniza la regulación de datos personales en Chile.',
  sections: [
    {
      id: "datos-recopilamos",
      t: "1. Datos que recopilamos",
      paragraphs: [
        "Recopilamos los datos mínimos necesarios para entregar el servicio. La cantidad depende de si te registras como estudiante o como empresa.",
      ],
      lists: [
        {
          title: "Si eres estudiante",
          items: [
            "Datos de identificación: nombre, apellido, RUT o documento extranjero, correo electrónico y teléfono.",
            "Datos académicos: universidad, carrera, semestre, año de egreso estimado.",
            "CV en PDF o DOCX (cuando lo subes voluntariamente).",
            "Habilidades, idiomas, certificaciones y experiencia laboral declaradas.",
            "Datos técnicos: IP, navegador, sistema operativo y registros de uso.",
          ],
        },
        {
          title: "Si eres empresa",
          items: [
            "Datos de identificación del registrante: nombre, apellido, cargo, correo corporativo y teléfono.",
            "Datos de la empresa: razón social, RUT (Chile) o Tax ID extranjero, industria, tamaño, sitio web y ciudad.",
            "Documentos de respaldo: certificado de vigencia, inicio de actividades u otros que solicite el equipo de revisión.",
            "Información sobre las prácticas que publicas en la plataforma.",
          ],
        },
      ],
    },
    {
      id: "como-usamos",
      t: "2. Cómo usamos tus datos",
      paragraphs: [
        "Usamos tus datos únicamente para los fines declarados a continuación. No vendemos tus datos a terceros.",
      ],
      lists: [
        {
          items: [
            "Hacer matching entre tu CV y las prácticas disponibles mediante modelos de inteligencia artificial.",
            "Permitir que las empresas que publican prácticas evalúen tu postulación cuando tú decides postularte.",
            "Enviarte notificaciones por correo electrónico relacionadas con tus postulaciones, entrevistas y mensajes.",
            "Verificar la identidad de las empresas para mantener la confianza en la plataforma.",
            "Mejorar nuestros algoritmos de match y la experiencia del producto (de forma agregada y anonimizada).",
            "Cumplir obligaciones legales y responder requerimientos de autoridades cuando corresponda.",
          ],
        },
      ],
    },
    {
      id: "base-legal",
      t: "3. Base legal del tratamiento",
      paragraphs: [
        "Tratamos tus datos personales bajo las siguientes bases legales: (a) tu consentimiento expreso, otorgado al aceptar esta política al momento de registrarte; (b) la ejecución del contrato de servicio que existe entre tú y PractiX; (c) el cumplimiento de obligaciones legales aplicables; y (d) el interés legítimo de PractiX para mejorar el servicio, siempre que no prevalezcan tus derechos fundamentales.",
      ],
    },
    {
      id: "compartimos",
      t: "4. Con quién compartimos tus datos",
      paragraphs: [
        "Compartimos datos solo con las partes estrictamente necesarias para entregar el servicio:",
      ],
      lists: [
        {
          items: [
            "Empresas a las que postulas (solo cuando decides postularte): reciben tu CV, perfil y mensajes que les envías.",
            "Proveedores tecnológicos: servicios de hosting, correo transaccional, almacenamiento y análisis. Todos sujetos a contratos de confidencialidad.",
            "Autoridades chilenas, cuando exista un requerimiento legal vinculante.",
          ],
        },
      ],
      paragraphs2: [
        "Nunca compartimos tus datos con redes publicitarias ni con terceros con fines comerciales no autorizados por ti.",
      ],
    },
    {
      id: "derechos-arco",
      t: "5. Tus derechos sobre tus datos",
      paragraphs: [
        "Como titular de los datos, tienes los siguientes derechos garantizados por la ley chilena:",
      ],
      lists: [
        {
          items: [
            "Acceso: solicitar copia de los datos que tenemos sobre ti.",
            "Rectificación: corregir datos inexactos o incompletos.",
            "Cancelación / Supresión: pedir que eliminemos tus datos cuando ya no sean necesarios.",
            "Oposición: oponerte al tratamiento por motivos legítimos.",
            "Portabilidad: recibir tus datos en un formato estructurado y trasladable.",
            "Bloqueo: solicitar la suspensión temporal del tratamiento.",
          ],
        },
      ],
      paragraphs2: [
        "Para ejercer cualquiera de estos derechos, escribe a privacidad@practix.cl. Respondemos en un plazo máximo de 15 días hábiles.",
      ],
    },
    {
      id: "seguridad",
      t: "6. Seguridad y conservación",
      paragraphs: [
        "Aplicamos medidas técnicas y organizativas razonables para proteger tus datos: cifrado en tránsito (TLS), cifrado en reposo, control de acceso por roles, registro de auditoría y revisiones periódicas de seguridad.",
        "Conservamos tus datos mientras tu cuenta esté activa. Si cierras tu cuenta, los eliminamos en un plazo máximo de 90 días, salvo que la ley nos obligue a conservarlos por más tiempo (por ejemplo, datos tributarios).",
      ],
    },
    {
      id: "cookies",
      t: "7. Cookies y tecnologías similares",
      paragraphs: [
        "Usamos cookies estrictamente necesarias para el funcionamiento de la sesión, cookies de preferencias para recordar tu configuración y cookies analíticas anonimizadas para entender cómo se usa el producto. No usamos cookies de publicidad de terceros.",
        "Puedes configurar tu navegador para rechazar cookies, pero algunas funcionalidades pueden dejar de funcionar correctamente.",
      ],
    },
    {
      id: "menores",
      t: "8. Menores de edad",
      paragraphs: [
        "PractiX está dirigido a personas mayores de 18 años. Si detectamos una cuenta de una persona menor de 18 años sin autorización del tutor legal, la suspenderemos y eliminaremos los datos asociados.",
      ],
    },
    {
      id: "cambios",
      t: "9. Cambios a esta política",
      paragraphs: [
        "Podemos actualizar esta política para reflejar cambios legales, tecnológicos o del producto. Si los cambios son materiales, te avisaremos por correo electrónico al menos 30 días antes de que entren en vigor.",
      ],
    },
    {
      id: "contacto",
      t: "10. Contacto",
      paragraphs: [
        "PractiX SpA · RUT 77.000.000-0 · Av. Vitacura 2939, Las Condes, Santiago de Chile.",
        "Encargado de Protección de Datos: privacidad@practix.cl",
        "Para reclamos, también puedes acudir a la Agencia de Protección de Datos Personales una vez que entre en operación.",
      ],
    },
  ],
};

const TERMINOS: LegalDoc = {
  title: "Términos de Uso",
  updated: UPDATED,
  intro:
    "Estos Términos regulan tu acceso y uso de PractiX. Al registrarte, declaras haberlos leído y aceptado. Si no estás de acuerdo, por favor no uses el servicio.",
  sections: [
    {
      id: "que-es",
      t: "1. Qué es PractiX",
      paragraphs: [
        "PractiX es una plataforma digital operada por PractiX SpA, sociedad chilena, que conecta estudiantes universitarios con empresas que ofrecen prácticas profesionales en Chile. Hacemos match entre perfiles y prácticas mediante inteligencia artificial.",
        "PractiX no es un empleador. La relación que pueda nacer entre el estudiante y la empresa es contractual entre ellos, y PractiX no es parte ni responsable de las condiciones del convenio de práctica.",
      ],
    },
    {
      id: "cuenta-estudiante",
      t: "2. Cuenta de estudiante",
      paragraphs: [
        "Para registrarte como estudiante necesitas tener al menos 18 años y ser estudiante regular de una institución de educación superior.",
        "Solo permitimos crear cuenta de estudiante con una cuenta de Google. Esto nos permite verificar tu identidad y reducir cuentas falsas. No se permite usar la cuenta de otra persona ni transferirla.",
        "Eres responsable de mantener tu información actualizada (especialmente carrera, semestre y CV) y de la veracidad de los datos que declaras.",
      ],
    },
    {
      id: "cuenta-empresa",
      t: "3. Cuenta de empresa",
      paragraphs: [
        "Las empresas se registran completando el formulario de creación, donde indican datos del registrante, datos de la empresa (incluido RUT chileno o documento equivalente), industria, sitio web y un correo corporativo.",
        "Toda cuenta de empresa queda en revisión hasta que el equipo de PractiX la aprueba. Nos reservamos el derecho de rechazar o suspender la cuenta si: (a) los datos son incorrectos o no verificables, (b) la empresa no existe o no está activa, (c) recibimos reportes de mala conducta hacia candidatos, (d) las prácticas publicadas incumplen estos Términos o la legislación laboral chilena.",
        "Si la empresa publica prácticas que no son tales (ej. trabajos a honorarios disfrazados de práctica), nos reservamos el derecho de retirarlas y suspender la cuenta sin previo aviso.",
      ],
    },
    {
      id: "conducta",
      t: "4. Conducta esperada",
      paragraphs: ["Como usuario de PractiX te comprometes a:"],
      lists: [
        {
          items: [
            "Usar la plataforma de buena fe y sin intentar engañar al sistema de match.",
            "No subir información falsa, plagiada o de terceros sin autorización.",
            "No contactar a candidatos o empresas con fines distintos a la práctica profesional (no spam, no ofertas comerciales).",
            "No usar la plataforma para discriminar por género, edad, nacionalidad, orientación sexual, religión, discapacidad o cualquier otra categoría protegida.",
            "No intentar acceder a partes del sistema que no te corresponden (cuentas de terceros, panel de administración, etc.).",
          ],
        },
      ],
      paragraphs2: [
        "El incumplimiento de estas reglas puede resultar en la suspensión o cierre de la cuenta sin reembolso.",
      ],
    },
    {
      id: "propiedad",
      t: "5. Propiedad intelectual",
      paragraphs: [
        "El software, la marca PractiX, el diseño del producto, los algoritmos de match y todo el contenido propio son propiedad de PractiX SpA.",
        "Tú conservas la propiedad sobre el contenido que subes (CV, fotos, descripción de proyectos). Al subirlo, nos otorgas una licencia gratuita, no exclusiva y revocable para usarlo dentro de la plataforma con el fin de hacer match con prácticas y mostrarlo a empresas a las que postulas.",
      ],
    },
    {
      id: "pagos",
      t: "6. Costos del servicio",
      paragraphs: [
        "Para estudiantes, PractiX es y será gratuito.",
        "Para empresas, el servicio puede incluir planes pagados con funcionalidades adicionales. Las condiciones específicas (precio, ciclo de facturación, política de cancelación) se acuerdan al contratar el plan y forman parte de estos Términos por referencia.",
      ],
    },
    {
      id: "limitacion",
      t: "7. Limitación de responsabilidad",
      paragraphs: [
        'PractiX entrega el servicio "tal como está". Hacemos esfuerzos razonables para que la plataforma esté disponible y los matches sean de calidad, pero no garantizamos que (a) consigas una práctica, (b) los candidatos cumplan las expectativas de la empresa, (c) el servicio esté libre de errores o interrupciones.',
        "En la máxima medida permitida por la ley, PractiX no será responsable por daños indirectos, lucro cesante, pérdida de oportunidades o daño moral derivados del uso de la plataforma. Nuestra responsabilidad máxima se limitará al monto efectivamente pagado por la empresa a PractiX en los 12 meses anteriores al hecho que origina el reclamo.",
      ],
    },
    {
      id: "terminacion",
      t: "8. Cierre de cuenta",
      paragraphs: [
        "Puedes cerrar tu cuenta en cualquier momento desde la configuración o escribiendo a soporte@practix.cl.",
        "PractiX puede suspender o cerrar tu cuenta si incumples estos Términos, si la cuenta queda inactiva por más de 18 meses, o si por razones legales o de seguridad debamos hacerlo.",
      ],
    },
    {
      id: "cambios-t",
      t: "9. Cambios a estos Términos",
      paragraphs: [
        "Podemos actualizar estos Términos. Si los cambios son materiales, te avisaremos por correo electrónico al menos 30 días antes. Si sigues usando el servicio después de la fecha de entrada en vigor, se entenderá que los aceptas.",
      ],
    },
    {
      id: "ley",
      t: "10. Ley aplicable y jurisdicción",
      paragraphs: [
        "Estos Términos se rigen por las leyes de la República de Chile.",
        "Cualquier controversia se someterá a los tribunales ordinarios de justicia con asiento en la ciudad de Santiago, sin perjuicio de los derechos del consumidor establecidos en la Ley N° 19.496.",
      ],
    },
    {
      id: "contacto-t",
      t: "11. Contacto",
      paragraphs: [
        "PractiX SpA · RUT 77.000.000-0 · Av. Vitacura 2939, Las Condes, Santiago.",
        "Soporte: soporte@practix.cl · Legal: legal@practix.cl",
      ],
    },
  ],
};

export function getDoc(key: LegalDocKey): LegalDoc {
  return key === "terminos" ? TERMINOS : PRIVACIDAD;
}
