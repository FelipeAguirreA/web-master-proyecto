import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUsePathname, mockUseSession, mockSignOut } = vi.hoisted(() => ({
  mockUsePathname: vi.fn(),
  mockUseSession: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
}));

vi.mock("next-auth/react", () => ({
  useSession: mockUseSession,
  signOut: mockSignOut,
}));

import { PublicNav } from "@/components/layout/PublicNav";

beforeEach(() => {
  mockUsePathname.mockReturnValue("/");
  mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
  mockSignOut.mockReset();
});

describe("PublicNav — logout (usuario no logueado)", () => {
  it("renderiza los 3 links públicos en desktop", () => {
    render(<PublicNav isLoggedIn={false} />);
    const nav = screen.getByRole("navigation");
    expect(nav).toHaveTextContent("Prácticas");
    expect(nav).toHaveTextContent("Producto");
    expect(nav).toHaveTextContent("Para empresas");
  });

  it("muestra CTAs 'Iniciar sesión' y 'Empezar gratis'", () => {
    render(<PublicNav isLoggedIn={false} />);
    // Ambos textos aparecen dos veces (header y drawer) — basta con que existan
    expect(screen.getAllByText("Iniciar sesión").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Empezar gratis").length).toBeGreaterThan(0);
  });

  it("NO muestra el link Admin ni Ir al panel", () => {
    render(<PublicNav isLoggedIn={false} />);
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.queryByText(/Ir al panel/i)).not.toBeInTheDocument();
  });

  it("marca 'Prácticas' como activo cuando pathname es /practicas", () => {
    mockUsePathname.mockReturnValue("/practicas");
    render(<PublicNav isLoggedIn={false} />);
    const nav = screen.getByRole("navigation");
    const practicasLink = Array.from(nav.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("Prácticas"),
    );
    expect(practicasLink?.className).toContain("bg-white");
  });

  it("marca 'Prácticas' como activo también en subrutas /practicas/xxx", () => {
    mockUsePathname.mockReturnValue("/practicas/123");
    render(<PublicNav isLoggedIn={false} />);
    const nav = screen.getByRole("navigation");
    const practicasLink = Array.from(nav.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("Prácticas"),
    );
    expect(practicasLink?.className).toContain("bg-white");
  });
});

describe("PublicNav — logueado", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Felipe", role: "STUDENT" } },
      status: "authenticated",
    });
  });

  it("muestra 'Dashboard' y 'Panel' en lugar de CTAs de login", () => {
    render(<PublicNav isLoggedIn={true} />);
    expect(screen.queryByText("Iniciar sesión")).not.toBeInTheDocument();
    expect(screen.queryByText("Empezar gratis")).not.toBeInTheDocument();
    expect(screen.getAllByText(/Dashboard/i).length).toBeGreaterThan(0);
  });

  it("muestra link Admin cuando isAdmin es true", () => {
    render(<PublicNav isLoggedIn={true} isAdmin={true} />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("NO muestra link Admin cuando isAdmin es false", () => {
    render(<PublicNav isLoggedIn={true} isAdmin={false} />);
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });
});

describe("PublicNav — drawer mobile", () => {
  it("abre el drawer al hacer click en el botón menú", async () => {
    const user = userEvent.setup();
    render(<PublicNav isLoggedIn={false} />);
    const aside = document.querySelector("aside");

    // aside starts translated (hidden)
    expect(aside?.className).toContain("-translate-x-full");

    await user.click(screen.getByLabelText("Abrir menú"));

    expect(aside?.className).toContain("translate-x-0");
  });

  it("cierra el drawer al hacer click en el botón X del drawer", async () => {
    const user = userEvent.setup();
    render(<PublicNav isLoggedIn={false} />);

    await user.click(screen.getByLabelText("Abrir menú"));
    // Dos botones con aria-label "Cerrar menú": backdrop y X. El último es la X.
    const closeBtns = screen.getAllByLabelText("Cerrar menú");
    await user.click(closeBtns[closeBtns.length - 1]);

    const aside = document.querySelector("aside");
    expect(aside?.className).toContain("-translate-x-full");
  });

  it("cierra el drawer al presionar Escape", async () => {
    const user = userEvent.setup();
    render(<PublicNav isLoggedIn={false} />);

    await user.click(screen.getByLabelText("Abrir menú"));
    const aside = document.querySelector("aside");
    expect(aside?.className).toContain("translate-x-0");

    await user.keyboard("{Escape}");

    expect(aside?.className).toContain("-translate-x-full");
  });

  it("cierra el drawer clickeando el backdrop", async () => {
    const user = userEvent.setup();
    render(<PublicNav isLoggedIn={false} />);

    await user.click(screen.getByLabelText("Abrir menú"));
    // El backdrop es el button con aria-label "Cerrar menú" que está absolute inset-0
    const backdrop = document.querySelector('button[aria-label="Cerrar menú"]');
    await user.click(backdrop!);

    const aside = document.querySelector("aside");
    expect(aside?.className).toContain("-translate-x-full");
  });

  it("al cerrar bloquea el scroll del body mientras está abierto", async () => {
    const user = userEvent.setup();
    render(<PublicNav isLoggedIn={false} />);

    expect(document.body.style.overflow).toBe("");
    await user.click(screen.getByLabelText("Abrir menú"));
    expect(document.body.style.overflow).toBe("hidden");
  });
});

describe("PublicNav — drawer mobile links según rol", () => {
  it("STUDENT ve Dashboard, Prácticas y Mensajes", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      data: { user: { name: "Ana", role: "STUDENT" } },
      status: "authenticated",
    });

    render(<PublicNav isLoggedIn={true} />);
    await user.click(screen.getByLabelText("Abrir menú"));

    const aside = document.querySelector("aside");
    expect(aside?.textContent).toContain("Dashboard");
    expect(aside?.textContent).toContain("Prácticas");
    expect(aside?.textContent).toContain("Mensajes");
  });

  it("COMPANY ve Dashboard, Prácticas, Mensajes y Calendario", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      data: { user: { name: "Corp", role: "COMPANY" } },
      status: "authenticated",
    });

    render(<PublicNav isLoggedIn={true} />);
    await user.click(screen.getByLabelText("Abrir menú"));

    const aside = document.querySelector("aside");
    expect(aside?.textContent).toContain("Calendario");
    expect(aside?.textContent).toContain("Mensajes");
  });

  it("muestra el label 'Estudiante' según rol", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      data: { user: { name: "Ana", role: "STUDENT" } },
      status: "authenticated",
    });

    render(<PublicNav isLoggedIn={true} />);
    await user.click(screen.getByLabelText("Abrir menú"));

    expect(screen.getByText("Estudiante")).toBeInTheDocument();
  });

  it("muestra el label 'Empresa' según rol", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      data: { user: { name: "Corp", role: "COMPANY" } },
      status: "authenticated",
    });

    render(<PublicNav isLoggedIn={true} />);
    await user.click(screen.getByLabelText("Abrir menú"));

    expect(screen.getByText("Empresa")).toBeInTheDocument();
  });

  it("muestra panel admin dentro del drawer cuando isAdmin", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      data: { user: { name: "Admin", role: "COMPANY" } },
      status: "authenticated",
    });

    render(<PublicNav isLoggedIn={true} isAdmin={true} />);
    await user.click(screen.getByLabelText("Abrir menú"));

    expect(screen.getByText("Panel admin")).toBeInTheDocument();
  });
});

describe("PublicNav — signOut", () => {
  it("dispara signOut con callbackUrl / al hacer click en 'Cerrar sesión'", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      data: { user: { name: "Felipe", role: "STUDENT" } },
      status: "authenticated",
    });

    render(<PublicNav isLoggedIn={true} />);
    await user.click(screen.getByLabelText("Abrir menú"));
    await user.click(screen.getByText("Cerrar sesión"));

    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });
});
