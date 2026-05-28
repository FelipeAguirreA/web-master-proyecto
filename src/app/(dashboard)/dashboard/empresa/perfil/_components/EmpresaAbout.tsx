"use client";

import { EmpresaBlock } from "./EmpresaBlock";

type Props = {
  description: string | null;
};

export function EmpresaAbout({ description }: Props) {
  return (
    <EmpresaBlock title="Sobre nosotros">
      {description ? (
        <p className="text-[13.5px] text-muted leading-[1.7] m-0 whitespace-pre-wrap">
          {description}
        </p>
      ) : (
        <p className="text-[13px] text-subtle italic m-0">
          Todavía no tienes una descripción. Haz clic en{" "}
          <strong className="font-bold not-italic">Editar perfil</strong> y
          cuéntale a los estudiantes qué hace tu empresa.
        </p>
      )}
    </EmpresaBlock>
  );
}
